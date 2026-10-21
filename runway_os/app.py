import html

import streamlit as st

import agent
from prompts import MODES

st.set_page_config(page_title="RunwayOS", page_icon="🚀", layout="wide")

CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
:root{--sp-bg:#FFFFFF;--sp-surface:#F7F9FC;--sp-border:#E8EDF4;--sp-navy:#0A1628;--sp-teal:#0077B6;--sp-teal-light:#E0F2FE;
--sp-green:#16A34A;--sp-amber:#D97706;--sp-red:#DC2626;--sp-muted:#6B7280;}
#MainMenu{visibility:hidden;} footer{visibility:hidden;} header[data-testid="stHeader"]{background:transparent;}
html,body,[class*="css"],.stApp,.stMarkdown{font-family:'Inter',sans-serif;color:var(--sp-navy);}
.stApp{background:var(--sp-bg);}
.block-container{max-width:1080px;padding-top:2rem;}
h1,h2,h3{font-weight:600;color:var(--sp-navy);}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:20px;}
.brand .dot{width:28px;height:28px;border-radius:8px;background:var(--sp-teal);color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;}
.brand span.sub{font-weight:500;color:var(--sp-muted);font-size:14px;margin-left:4px;}
/* mode pills */
div[data-testid="stButton"] button{border-radius:999px;font-weight:600;font-family:'Inter',sans-serif;padding:.45rem 1.1rem;width:100%;}
button[data-testid="stBaseButton-secondary"]{background:#fff;border:1px solid var(--sp-border);color:var(--sp-navy);}
button[data-testid="stBaseButton-secondary"]:hover{border-color:var(--sp-teal);color:var(--sp-teal);}
button[data-testid="stBaseButton-primary"]{background:var(--sp-teal);border:1px solid var(--sp-teal);color:#fff;}
button[data-testid="stBaseButton-primary"]:hover{background:#005f92;border-color:#005f92;color:#fff;}
.card{background:#fff;border:1px solid var(--sp-border);border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.06);}
.surface{background:var(--sp-surface);border:1px solid var(--sp-border);border-radius:12px;padding:14px;}
.hero{text-align:center;padding:8px 0 4px;}
.ringwrap{position:relative;width:280px;height:280px;margin:0 auto;}
.ringwrap svg{transform:rotate(-90deg);}
.ring-bg{fill:none;stroke:var(--sp-border);stroke-width:16;}
.ring-fg{fill:none;stroke-width:16;stroke-linecap:round;stroke-dasharray:var(--c);stroke-dashoffset:var(--c);animation:fill 1.6s cubic-bezier(.22,1,.36,1) forwards;}
@keyframes fill{to{stroke-dashoffset:var(--off);}}
.ringnum{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.ringnum .n{font-size:80px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;}
.ringnum .of{font-size:13px;color:var(--sp-muted);margin-top:4px;}
.lbl{display:inline-block;margin-top:10px;font-weight:700;font-size:18px;}
.headline{font-size:22px;font-weight:600;margin:14px auto 4px;max-width:720px;}
.muted{color:var(--sp-muted);font-size:13px;}
.dim-top{display:flex;align-items:center;gap:8px;font-weight:600;font-size:15px;}
.dim-top .sc{margin-left:auto;font-weight:700;font-variant-numeric:tabular-nums;}
.bar{height:8px;border-radius:99px;background:var(--sp-border);margin:12px 0;overflow:hidden;}
.bar>div{height:100%;border-radius:99px;width:0;animation:grow 1.2s ease-out forwards;}
@keyframes grow{to{width:var(--w);}}
.insight{font-size:13.5px;color:var(--sp-navy);min-height:40px;line-height:1.45;}
.pill{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;margin-top:8px;}
.p-green{background:#DCFCE7;color:#15803D;} .p-amber{background:#FEF3C7;color:#B45309;} .p-red{background:#FEE2E2;color:#B91C1C;}
.forlabel{color:var(--sp-teal);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;}
.narr p{font-size:15.5px;line-height:1.7;margin:0 0 12px;}
.anom{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--sp-border);}
.anom:last-child{border-bottom:none;}
.anom .ic{font-size:20px;} .anom .d{font-weight:600;font-size:14.5px;} .anom .a{font-size:13.5px;color:var(--sp-muted);margin-top:2px;}
.banner{background:#FFFBEB;border:1px solid #FCD34D;border-left:4px solid var(--sp-amber);border-radius:12px;padding:14px 16px;margin-top:14px;}
.banner b{color:#92400E;}
.mono{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--sp-navy);line-height:1.7;}
.sect{font-weight:600;font-size:18px;margin:28px 0 12px;}
</style>
"""
st.markdown(CSS, unsafe_allow_html=True)

COL = {"green": "var(--sp-green)", "amber": "var(--sp-amber)", "red": "var(--sp-red)"}


def esc(x):
    return html.escape(str(x))


def band(score, hi=80, mid=60):
    return "green" if score >= hi else "amber" if score >= mid else "red"


def ring(score, label):
    c = COL[band(score)]
    circ = 2 * 3.14159265 * 120
    off = circ * (1 - score / 100)
    return (
        f'<div class="hero"><div class="ringwrap"><svg width="280" height="280" viewBox="0 0 280 280">'
        f'<circle class="ring-bg" cx="140" cy="140" r="120"/>'
        f'<circle class="ring-fg" cx="140" cy="140" r="120" style="--c:{circ:.1f};--off:{off:.1f};stroke:{c}"/></svg>'
        f'<div class="ringnum"><div class="n" style="color:{c}">{score}</div><div class="of">out of 100</div></div></div>'
        f'<div class="lbl" style="color:{c}">{label}</div>'
        f'<div class="muted" style="margin-top:2px">Powered by Claude + Seapoint</div></div>'
    )


FLAG = {"confident": ("✅ Confident", "p-green"), "review": ("⚠️ Review Suggested", "p-amber"), "act_now": ("🚨 Act Now", "p-red")}


def dim_card(d):
    s = d["score"]
    if s is None:
        w, c = 0, "var(--sp-muted)"
        sc = "n/a"
    else:
        w, c, sc = s / 20 * 100, COL[band(s, 16, 12)], f"{s:g}/20"
    txt, cls = FLAG[d["flag"]]
    return (
        f'<div class="card" style="margin-bottom:16px"><div class="dim-top"><span>{d["icon"]}</span><span>{esc(d["label"])}</span>'
        f'<span class="sc" style="color:{c}">{sc}</span></div>'
        f'<div class="bar"><div style="--w:{w:.0f}%;background:{c}"></div></div>'
        f'<div class="insight">{esc(d["insight"])}</div><span class="pill {cls}">{txt}</span></div>'
    )


# ---------------- state ----------------
ss = st.session_state
ss.setdefault("mode", "investor")
ss.setdefault("data", None)
ss.setdefault("results", {})
ss.setdefault("approved", {})

st.markdown('<div class="brand"><div class="dot">🚀</div>RunwayOS<span class="sub">for Seapoint</span></div>', unsafe_allow_html=True)
st.write("")

cols = st.columns(4)
for col, (key, m) in zip(cols, MODES.items()):
    if col.button(m["label"], key=f"mode_{key}", type="primary" if ss.mode == key else "secondary"):
        ss.mode = key
        st.rerun()


def run(mode):
    if ss.data is None:
        with st.spinner("Agent is querying Seapoint across 6 dimensions…"):
            ss.data = agent.load_data()
    if mode not in ss.results:
        with st.spinner(f"Claude is writing the {MODES[mode]['label']} narrative…"):
            ss.results[mode] = agent.run_analysis(mode, ss.data)


st.write("")
if ss.data is None:
    st.markdown(
        '<div class="card" style="text-align:center;padding:48px 20px"><div style="font-size:22px;font-weight:600">'
        'How healthy is this startup, really?</div><div class="muted" style="margin:8px 0 0">'
        'One click. Claude queries Seapoint across six dimensions and scores financial health 0–100.</div></div>',
        unsafe_allow_html=True,
    )
    _, mid, _ = st.columns([2, 1.4, 2])
    if mid.button("Run Analysis", type="primary", key="run"):
        run(ss.mode)
        st.rerun()
    st.stop()

run(ss.mode)  # cached Seapoint data; only re-runs the Claude step for a new mode
r = ss.results[ss.mode]

st.markdown(ring(r["overall_score"], r["label"]), unsafe_allow_html=True)
st.markdown(f'<div class="hero"><div class="headline">{esc(r["headline"])}</div></div>', unsafe_allow_html=True)

if r.get("claude_error"):
    st.warning(f"Claude step unavailable ({r['claude_error']}). Showing computed metrics only.", icon="⚠️")

st.markdown('<div class="sect">Score breakdown</div>', unsafe_allow_html=True)
for i in range(0, 6, 2):
    c1, c2 = st.columns(2, gap="medium")
    c1.markdown(dim_card(r["dimensions"][i]), unsafe_allow_html=True)
    c2.markdown(dim_card(r["dimensions"][i + 1]), unsafe_allow_html=True)

paras = "".join(f"<p>{esc(p)}</p>" for p in r["narrative"].split("\n") if p.strip())
st.markdown(f'<div class="card narr"><div class="forlabel">For your {MODES[ss.mode]["label"]}</div>{paras}</div>', unsafe_allow_html=True)

st.markdown('<div class="sect">Anomalies & actions</div>', unsafe_allow_html=True)
if r["anomalies"]:
    rows = "".join(
        f'<div class="anom"><div class="ic">{esc(a.get("icon", "•"))}</div><div><div class="d">{esc(a.get("description", ""))}</div>'
        f'<div class="a">→ {esc(a.get("action", ""))}</div></div></div>' for a in r["anomalies"])
    st.markdown(f'<div class="card" style="padding:8px 20px">{rows}</div>', unsafe_allow_html=True)
else:
    st.markdown('<div class="muted">No anomalies flagged.</div>', unsafe_allow_html=True)

# ---- Safety: human-in-the-loop for writes ----
pending = [p for p in r["uncategorised_transactions"] if p["id"] not in ss.approved]
done = [p for p in r["uncategorised_transactions"] if p["id"] in ss.approved]
if pending:
    st.markdown(
        '<div class="banner"><b>⚠️ Agent paused — human approval required</b><div class="muted" style="margin-top:4px">'
        f'{len(pending)} transaction(s) sit in a catch-all category with unknown counterparties. Claude proposes a category; '
        'nothing is written to Seapoint until you approve.</div></div>', unsafe_allow_html=True)
    for p in pending:
        a, b = st.columns([4, 1])
        a.markdown(
            f'<div class="surface"><b>£{p.get("amount", 0):,.2f}</b> · {esc(p.get("description", ""))}<br>'
            f'<span class="muted">Proposed: <b style="color:var(--sp-teal)">{esc(p["proposed_category"])}</b> — {esc(p.get("reasoning", ""))}</span></div>',
            unsafe_allow_html=True)
        if b.button("Approve", key=f"ok_{p['id']}", type="primary"):
            res = agent.apply_category([p["id"]], p["category_id"])
            if res["ok"]:
                ss.approved[p["id"]] = res["message"]
            else:
                st.error(res["message"])
            st.rerun()
for p in done:
    st.success(f"{p['id'][-6:]} → {p['proposed_category']}. {ss.approved[p['id']]}", icon="✅")

with st.expander("Agent log", expanded=False):
    lines = "".join(f"<div>▸ <b>{esc(c['tool'])}</b> — {esc(c['summary'])}</div>" for c in r["agent_log"])
    st.markdown(f'<div class="surface mono">source: {esc(r["data_source"])}<br>{lines}</div>', unsafe_allow_html=True)
