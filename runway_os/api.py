"""Thin FastAPI wrapper over the existing RunwayOS agent. No business logic here."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import agent
import scorer
from prompts import MODES

_data = None
_cache: dict = {}


def _get_data():
    global _data
    if _data is None:
        _data = agent.load_data()
    return _data


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        _get_data()  # warm the Seapoint data once
    except Exception as e:  # don't block the server on a data problem
        print(f"startup data load failed: {e}")
    yield


app = FastAPI(title="RunwayOS API", lifespan=lifespan)


@app.get("/api/modes")
def modes():
    return [{"key": k, "label": v["label"]} for k, v in MODES.items()]


@app.get("/api/analyze")
def analyze(mode: str = "investor"):
    mode = mode.lower()
    if mode not in MODES:
        raise HTTPException(404, f"unknown mode: {mode}")
    if mode not in _cache:
        _cache[mode] = agent.run_analysis(mode, _get_data())
    return _cache[mode]


@app.get("/api/context")
def context():
    """Instant, LLM-free view of the Seapoint data: what each specialist reads on screen."""
    d = _get_data()
    inv = d.get("invoices", {})
    return {
        "source": d.get("source"),
        "metrics": scorer.compute_metrics(d),
        "accounts": d.get("accounts", []),
        "categories": [
            {"name": k, "amount": v} for k, v in d.get("burn_by_category_jul_oct_gbp", {}).items()
        ][:6],
        "months": [{"month": k, "amount": v} for k, v in d.get("monthly_burn_gbp", {}).items()],
        "vendors": d.get("top_vendors_jul_oct_gbp", [])[:6],
        "vendor_count": d.get("vendor_count"),
        "invoices": inv,
        "flagged": d.get("low_confidence_categorised", {}).get("transactions", [])[:6],
    }


class Approval(BaseModel):
    transaction_id: str
    category_id: str


@app.post("/api/approve")
def approve(body: Approval):
    """Human-approved write. The UI must have shown the proposal before calling this."""
    valid = {t["id"] for t in _get_data().get("low_confidence_categorised", {}).get("transactions", [])}
    if body.transaction_id not in valid:
        raise HTTPException(400, "transaction id not in the fetched Seapoint data")
    if body.category_id not in set(_get_data().get("category_ids", {}).values()):
        raise HTTPException(400, "unknown category id")
    return agent.apply_category([body.transaction_id], body.category_id)
