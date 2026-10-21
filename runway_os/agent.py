"""RunwayOS agent: gather Seapoint data -> score -> Claude narrative per audience mode."""
import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv

import scorer
from prompts import MODES

load_dotenv(Path(__file__).parent / ".env")

MODEL = "claude-opus-5-5"
MCP_URL = "https://mcp.seapoint.dev/mcp"
SNAPSHOT = Path(__file__).parent / "seapoint_snapshot.json"

FETCH_PROMPT = """Use the Seapoint MCP tools to collect data for a financial health check, then output ONLY a JSON
object (no prose) with the same shape as this example's keys: org{id,name,currency}, accounts[{name,type,gbp,net_yield_pct?}],
cash_total_gbp (banking cash_position + treasury total, reporting currency), monthly_burn_gbp{YYYY-MM: amount} for the last 6
months (debits, include_excluded_from_runway=false, aggregate by month on reporting_amount), burn_by_category_jul_oct_gbp
(last 3 months by category name), top_vendors_jul_oct_gbp[{name,spend,txns,category}] (top 8 by spend, last 3 months),
total_debit_spend_jul_oct_gbp, vendor_count, invoices{unpaid{count,total_gbp,earliest_due},overdue{count,total_gbp},
paid{count,total_gbp},all_total_gbp}, treasury{net_yield_pct,yield_as_of,oct_mtd_return_gbp,balance_gbp},
low_confidence_categorised{note,total_in_catchall,transactions[{id,date,amount,description,counterparty}]} (transactions with
no category, or in the catch-all 'General Expenses' with unknown counterparties; max 10), category_ids{"Group › Leaf": id}.
Steps: get_current_user, query_accounts, query_transactions (aggregate), query_transaction_participants, query_invoices
(is_paid=false and overdue), query_treasury_returns, query_categories. Only read; never write."""


def _client():
    import anthropic
    return anthropic.Anthropic()


def _extract_json(text: str) -> dict:
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    start, end = text.find("{"), text.rfind("}")
    return json.loads(text[start:end + 1])


def live_enabled() -> bool:
    return bool(os.getenv("SEAPOINT_MCP_TOKEN") and os.getenv("ANTHROPIC_API_KEY"))


def _mcp_call(prompt: str) -> str:
    resp = _client().beta.messages.create(
        model=MODEL, max_tokens=8000, betas=["mcp-client-2025-04-04"],
        mcp_servers=[{"type": "url", "url": MCP_URL, "name": "seapoint",
                      "authorization_token": os.environ["SEAPOINT_MCP_TOKEN"]}],
        messages=[{"role": "user", "content": prompt}],
    )
    return "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")


def load_data() -> dict:
    """Live via Anthropic's MCP connector when a Seapoint token is set, else the bundled real snapshot."""
    if live_enabled():
        try:
            data = _extract_json(_mcp_call(FETCH_PROMPT))
            data["source"] = "Seapoint MCP (live)"
            data["tool_calls"] = [{"tool": "mcp connector", "summary": "Claude queried Seapoint MCP live"}]
            return data
        except Exception as e:  # fall back, but say so
            data = json.loads(SNAPSHOT.read_text())
            data["tool_calls"].insert(0, {"tool": "live fetch FAILED", "summary": f"{type(e).__name__}: {e}"[:200]})
            return data
    return json.loads(SNAPSHOT.read_text())


def _fallback(mode, metrics, dims, data):
    """Deterministic narrative when Claude is unavailable, so the UI never breaks."""
    rw = metrics.get("runway_months") or 0
    heads = {
        "investor": f"{rw:.1f} months runway at current burn.",
        "hiring": f"Financially stable for the next {int(rw)} months.",
        "partner": f"{data['invoices']['paid']['count']} of {data['invoices']['paid']['count'] + data['invoices']['unpaid']['count']} invoices paid; {metrics.get('overdue_count', 0)} overdue.",
        "founder": "Your biggest risk right now is overdue payables and the September burn spike.",
    }
    return {
        "headline": heads[mode],
        "dimensions": [{"key": d["key"], "insight": d["detail"]} for d in dims],
        "narrative": "(Claude narrative unavailable - showing computed metrics only.) " + "; ".join(d["detail"] for d in dims),
        "anomalies": [], "uncategorised_transactions": [], "confidence_flags": {},
    }


def run_analysis(mode: str, data: dict | None = None) -> dict:
    mode = mode.lower()
    data = data or load_data()
    metrics = scorer.compute_metrics(data)
    dims = scorer.score_dimensions(metrics)
    total = scorer.overall(dims)

    log = [dict(c) for c in data.get("tool_calls", [])]
    claude, err = None, None
    if os.getenv("ANTHROPIC_API_KEY"):
        try:
            payload = {"mode": mode, "metrics": metrics,
                       "computed_scores": [{k: d[k] for k in ("key", "score", "flag", "detail")} for d in dims],
                       "overall_score": total,
                       "data": {k: v for k, v in data.items() if k != "tool_calls"}}
            resp = _client().messages.create(
                model=MODEL, max_tokens=6000, system=MODES[mode]["prompt"],
                messages=[{"role": "user", "content": "Seapoint data and computed scores:\n" + json.dumps(payload, default=str)}],
            )
            claude = _extract_json("".join(b.text for b in resp.content if b.type == "text"))
            log.append({"tool": f"claude ({MODEL})", "summary": f"Narrative for {mode} mode generated"})
        except Exception as e:
            err = f"{type(e).__name__}: {e}"[:200]
    else:
        err = "ANTHROPIC_API_KEY not set"
    if claude is None:
        claude = _fallback(mode, metrics, dims, data)
        log.append({"tool": "claude", "summary": f"UNAVAILABLE ({err}) - used deterministic fallback"})

    ins = {d["key"]: d.get("insight", "") for d in claude.get("dimensions", [])}
    for d in dims:
        d["insight"] = ins.get(d["key"]) or d["detail"]
    # only allow proposals for ids we actually fetched, and categories that exist
    valid_ids = {t["id"] for t in data.get("low_confidence_categorised", {}).get("transactions", [])}
    cats = data.get("category_ids", {})
    props = []
    for p in claude.get("uncategorised_transactions", []):
        if p.get("id") in valid_ids and p.get("proposed_category") in cats:
            p["category_id"] = cats[p["proposed_category"]]
            props.append(p)

    return {
        "mode": mode, "overall_score": total, "label": scorer.label_for(total),
        "headline": claude.get("headline", ""), "dimensions": dims, "narrative": claude.get("narrative", ""),
        "anomalies": claude.get("anomalies", []), "uncategorised_transactions": props,
        "confidence_flags": {d["key"]: d["flag"] for d in dims}, "metrics": metrics,
        "agent_log": log, "data_source": data.get("source", "snapshot"), "claude_error": err,
    }


def apply_category(transaction_ids: list, category_id: str) -> dict:
    """WRITE. Call only after explicit human approval in the UI."""
    if not live_enabled():
        return {"ok": True, "simulated": True,
                "message": "Snapshot mode (no SEAPOINT_MCP_TOKEN): approval recorded, write NOT sent to Seapoint."}
    try:
        out = _mcp_call(
            "The user has explicitly approved this change. Call set_transaction_category with exactly "
            f"transaction_ids={json.dumps(transaction_ids)} and category_id={json.dumps(category_id)}, then reply with "
            "the change_id only.")
        return {"ok": True, "simulated": False, "message": f"Written to Seapoint. {out.strip()[:200]}"}
    except Exception as e:
        return {"ok": False, "simulated": False, "message": f"{type(e).__name__}: {e}"[:300]}
