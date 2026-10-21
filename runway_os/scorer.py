"""Deterministic scoring: Seapoint data snapshot -> metrics + 6 dimension scores (0-20 each)."""

DIM_META = [
    ("burn_rate", "Burn Rate Health", "🔥"),
    ("runway", "Runway", "📅"),
    ("vendor_concentration", "Vendor Concentration", "💳"),
    ("spend_trend", "Spend Trend", "📈"),
    ("payables", "Payables Health", "⚠️"),
    ("cash_buffer", "Cash Buffer", "💰"),
]


def _lerp(x, lo, hi, out_lo, out_hi):
    if x <= lo:
        return out_lo
    if x >= hi:
        return out_hi
    return out_lo + (x - lo) / (hi - lo) * (out_hi - out_lo)


def compute_metrics(d: dict) -> dict:
    m = {}
    months = {k: v for k, v in d.get("monthly_burn_gbp", {}).items() if "partial" not in k}
    keys = sorted(months)
    last3 = [months[k] for k in keys[-3:]]
    cash = d.get("cash_total_gbp")
    m["cash"] = cash
    m["avg_burn_3m"] = sum(last3) / len(last3) if last3 else None
    m["last_month_burn"] = months[keys[-1]] if keys else None
    m["prev_month_burn"] = months[keys[-2]] if len(keys) > 1 else None
    m["mom_change_pct"] = (
        (m["last_month_burn"] / m["prev_month_burn"] - 1) * 100 if m["prev_month_burn"] else None
    )
    m["runway_months"] = cash / m["avg_burn_3m"] if cash and m["avg_burn_3m"] else None
    m["cash_to_3m_burn"] = cash / (m["avg_burn_3m"] * 3) if cash and m["avg_burn_3m"] else None
    vendors = d.get("top_vendors_jul_oct_gbp") or []
    total = d.get("total_debit_spend_jul_oct_gbp")
    if vendors and total:
        m["top_vendor"] = vendors[0]["name"]
        m["top_vendor_pct"] = vendors[0]["spend"] / total * 100
        m["top3_pct"] = sum(v["spend"] for v in vendors[:3]) / total * 100
    inv = d.get("invoices") or {}
    if inv:
        tot = inv.get("all_total_gbp") or 0
        m["unpaid_pct"] = inv["unpaid"]["total_gbp"] / tot * 100 if tot else None
        m["overdue_pct"] = inv["overdue"]["total_gbp"] / tot * 100 if tot else None
        n_all = inv["unpaid"]["count"] + inv["paid"]["count"]
        m["invoice_paid_rate_pct"] = inv["paid"]["count"] / n_all * 100 if n_all else None
        m["overdue_count"] = inv["overdue"]["count"]
        m["overdue_total"] = inv["overdue"]["total_gbp"]
    t = d.get("treasury") or {}
    m["treasury_yield_pct"] = t.get("net_yield_pct")
    m["treasury_balance"] = t.get("balance_gbp")
    m["treasury_share_pct"] = t["balance_gbp"] / cash * 100 if t.get("balance_gbp") and cash else None
    return m


def score_dimensions(m: dict) -> list:
    """Returns list of {key,label,icon,score,flag,detail}; score=None when data is missing."""
    out = []

    def add(key, score, detail, red, amber):
        label, icon = next((l, i) for k, l, i in DIM_META if k == key)
        if score is None:
            flag = "review"
        else:
            flag = "act_now" if score < red else "review" if score < amber else "confident"
        out.append({"key": key, "label": label, "icon": icon,
                    "score": None if score is None else round(score, 1),
                    "flag": flag, "detail": detail})

    rw, c3, burn = m.get("runway_months"), m.get("cash_to_3m_burn"), m.get("avg_burn_3m")
    # 1. burn sustainability = burn as % of cash per month (<3% great, >15% terrible)
    if burn and m.get("cash"):
        pct = burn / m["cash"] * 100
        add("burn_rate", _lerp(pct, 3, 15, 20, 0), f"Burn £{burn:,.0f}/mo = {pct:.1f}% of cash", 8, 14)
    else:
        add("burn_rate", None, "No burn data", 8, 14)
    # 2. runway: >=12 full, <=3 zero
    add("runway", None if rw is None else _lerp(rw, 3, 12, 0, 20),
        "No runway data" if rw is None else f"{rw:.1f} months of runway", 8, 14)
    # 3. concentration: <=30% full, >=60% zero
    tp = m.get("top_vendor_pct")
    add("vendor_concentration", None if tp is None else _lerp(tp, 30, 60, 20, 0),
        "No vendor data" if tp is None else f"{m['top_vendor']} = {tp:.0f}% of spend", 8, 14)
    # 4. trend: MoM <=0 full, >=+25% zero
    mom = m.get("mom_change_pct")
    add("spend_trend", None if mom is None else _lerp(mom, 0, 25, 20, 0),
        "No trend data" if mom is None else f"Burn {mom:+.1f}% MoM", 8, 14)
    # 5. payables: overdue % of invoice value (0% full, 40%+ zero), plus unpaid drag
    if m.get("overdue_pct") is not None:
        s = _lerp(m["overdue_pct"] + 0.25 * (m["unpaid_pct"] - m["overdue_pct"]), 0, 40, 20, 0)
        add("payables", s, f"{m['overdue_count']} overdue (£{m['overdue_total']:,.0f}), "
            f"{m['unpaid_pct']:.0f}% of invoice value unpaid", 8, 14)
    else:
        add("payables", None, "No invoice data", 8, 14)
    # 6. buffer: cash / 3m burn, >=3x full, <=1x zero
    add("cash_buffer", None if c3 is None else _lerp(c3, 1, 3, 0, 20),
        "No buffer data" if c3 is None else f"Cash = {c3:.1f}x three-month burn", 8, 14)
    return out


def overall(dims: list) -> int:
    scored = [d["score"] for d in dims if d["score"] is not None]
    if not scored:
        return 0
    return round(sum(scored) / len(scored) * 6)  # null dims don't penalise: rescale to /100


def label_for(score: int) -> str:
    return "Strong" if score >= 80 else "Caution" if score >= 60 else "Critical"
