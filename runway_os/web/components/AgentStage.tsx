"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calculator,
  ClipboardCheck,
  Database,
  Landmark,
  Network,
  ShieldCheck,
  Sparkles,
  Terminal,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import type { Analysis, Context } from "@/lib/types";

const AGENT_MS = 3800;
const CALLOUT_MS = 3000;
const TICK = 100;

const n = (v: unknown): number | null => (typeof v === "number" ? v : null);
const s = (v: unknown): string | null => (typeof v === "string" ? v : null);

function money(v: unknown, dp = 0): string {
  const x = n(v);
  if (x === null) return "—";
  if (Math.abs(x) >= 1_000_000) return `£${(x / 1_000_000).toFixed(2)}M`;
  if (Math.abs(x) >= 1_000) return `£${Math.round(x / 1_000)}k`;
  return `£${x.toFixed(dp)}`;
}
const full = (v: unknown): string => {
  const x = n(v);
  return x === null ? "—" : `£${Math.round(x).toLocaleString("en-GB")}`;
};
const monthName = (iso: string) =>
  iso.includes("partial")
    ? "Oct (part)"
    : new Date(`${iso}-01`).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });

interface Row {
  label: string;
  value: string;
}
interface Stage {
  key: string;
  role: string;
  blurb: string;
  tool: string;
  resource: string;
  accent: string;
  icon: LucideIcon;
  thoughts: string[];
  rows: (c: Context) => Row[];
  big: (c: Context) => string;
  unit: string;
  insight: (c: Context) => string;
}

const STAGES: Stage[] = [
  {
    key: "treasury",
    role: "Treasury Analyst",
    blurb: "Establishing how much cash there actually is",
    tool: "query_accounts",
    resource: "accounts · balances",
    accent: "#22d3ee",
    icon: Landmark,
    thoughts: ["Listing every open account", "Converting each balance into GBP", "Excluding closed accounts from the total"],
    rows: (c) => c.accounts.map((a) => ({ label: a.name, value: full(a.gbp) })),
    big: (c) => money(c.metrics.cash),
    unit: "eligible cash",
    insight: (c) => {
      const share = n(c.metrics.treasury_share_pct);
      const y = n(c.metrics.treasury_yield_pct);
      return `Across ${c.accounts.length} open accounts${
        share !== null ? `. ${share.toFixed(0)}% sits in Treasury` : ""
      }${y !== null ? ` at ${y.toFixed(2)}% net yield` : ""}.`;
    },
  },
  {
    key: "controller",
    role: "Controller",
    blurb: "Totalling what actually leaves the business",
    tool: "query_transactions · aggregate",
    resource: "transactions · by category",
    accent: "#34d399",
    icon: Calculator,
    thoughts: ["Pulling every debit, internal transfers excluded", "Grouping the quarter by category", "Averaging the last three full months"],
    rows: (c) => c.categories.map((x) => ({ label: x.name, value: full(x.amount) })),
    big: (c) => `${money(c.metrics.avg_burn_3m)}`,
    unit: "average monthly burn",
    insight: (c) =>
      `Three-month average. ${c.categories[0]?.name ?? "Payroll"} is the largest line at ${full(
        c.categories[0]?.amount,
      )} over the quarter.`,
  },
  {
    key: "forecaster",
    role: "Forecaster",
    blurb: "Checking whether burn is holding or climbing",
    tool: "query_transactions · by month",
    resource: "transactions · monthly series",
    accent: "#a78bfa",
    icon: TrendingUp,
    thoughts: ["Bucketing ten months of spend", "Comparing the last month to the one before", "Testing it against the Jan–Aug range"],
    rows: (c) =>
      c.months.slice(-6).map((m) => ({ label: monthName(m.month), value: full(m.amount) })),
    big: (c) => {
      const x = n(c.metrics.mom_change_pct);
      return x === null ? "—" : `${x > 0 ? "+" : ""}${x.toFixed(1)}%`;
    },
    unit: "month-on-month change",
    insight: (c) =>
      `Last full month was ${full(c.metrics.last_month_burn)} against ${full(
        c.metrics.prev_month_burn,
      )} the month before.`,
  },
  {
    key: "vendor",
    role: "Vendor Analyst",
    blurb: "Looking for single points of failure in spend",
    tool: "query_transaction_participants",
    resource: "participants · vendors",
    accent: "#f472b6",
    icon: Network,
    thoughts: ["Grouping spend by counterparty", "Ranking suppliers by share of the total", "Checking single-supplier exposure"],
    rows: (c) => c.vendors.map((v) => ({ label: v.name, value: full(v.spend) })),
    big: (c) => {
      const x = n(c.metrics.top_vendor_pct);
      return x === null ? "—" : `${x.toFixed(0)}%`;
    },
    unit: "top-vendor share of spend",
    insight: (c) => {
      const top = s(c.metrics.top_vendor) ?? "The largest vendor";
      const t3 = n(c.metrics.top3_pct);
      return `${top} leads ${c.vendor_count ?? "all"} vendors${
        t3 !== null ? `; the top three take ${t3.toFixed(0)}% between them` : ""
      }.`;
    },
  },
  {
    key: "auditor",
    role: "Auditor",
    blurb: "Auditing what the business owes and has not paid",
    tool: "query_invoices",
    resource: "invoices · unpaid + overdue",
    accent: "#fb923c",
    icon: ClipboardCheck,
    thoughts: ["Pulling unpaid supplier invoices", "Flagging anything past its due date", "Weighing overdue value against the total"],
    rows: (c) => {
      const i = c.invoices;
      const out: Row[] = [];
      if (i.unpaid) out.push({ label: "Unpaid invoices", value: `${i.unpaid.count}` });
      if (i.unpaid) out.push({ label: "Outstanding value", value: full(i.unpaid.total_gbp) });
      if (i.overdue) out.push({ label: "Past due date", value: `${i.overdue.count}` });
      if (i.overdue) out.push({ label: "Overdue value", value: full(i.overdue.total_gbp) });
      if (i.paid) out.push({ label: "Settled invoices", value: `${i.paid.count}` });
      if (i.unpaid?.earliest_due)
        out.push({ label: "Earliest unpaid due", value: i.unpaid.earliest_due.slice(0, 10) });
      return out;
    },
    big: (c) => `${n(c.metrics.overdue_count) ?? "—"}`,
    unit: "invoices past their due date",
    insight: (c) => {
      const p = n(c.metrics.unpaid_pct);
      return `${full(c.metrics.overdue_total)} is overdue${
        p !== null ? `, and ${p.toFixed(0)}% of all invoice value is still unpaid` : ""
      }.`;
    },
  },
  {
    key: "risk",
    role: "Risk Officer",
    blurb: "Stress-testing the cushion against a bad quarter",
    tool: "scorer · cash buffer",
    resource: "derived · runway model",
    accent: "#60a5fa",
    icon: ShieldCheck,
    thoughts: ["Dividing cash by three-month burn", "Deriving runway at the current rate", "Scoring the buffer against a downturn"],
    rows: (c) => {
      const b3 = n(c.metrics.avg_burn_3m);
      return [
        { label: "Eligible cash", value: full(c.metrics.cash) },
        { label: "Three-month burn", value: b3 === null ? "—" : full(b3 * 3) },
        { label: "Runway", value: `${(n(c.metrics.runway_months) ?? 0).toFixed(1)} months` },
        { label: "Treasury share", value: `${(n(c.metrics.treasury_share_pct) ?? 0).toFixed(0)}%` },
        { label: "Invoices paid", value: `${(n(c.metrics.invoice_paid_rate_pct) ?? 0).toFixed(0)}%` },
      ];
    },
    big: (c) => {
      const x = n(c.metrics.cash_to_3m_burn);
      return x === null ? "—" : `${x.toFixed(1)}×`;
    },
    unit: "cash against three-month burn",
    insight: (c) =>
      `That is ${(n(c.metrics.runway_months) ?? 0).toFixed(1)} months of runway at the current burn rate.`,
  },
];

type Step = { kind: "agent"; i: number } | { kind: "callout"; upto: number };

/** Work two specialists, then pull back and show the board. */
const SEQ: Step[] = [
  { kind: "agent", i: 0 },
  { kind: "agent", i: 1 },
  { kind: "callout", upto: 2 },
  { kind: "agent", i: 2 },
  { kind: "agent", i: 3 },
  { kind: "callout", upto: 4 },
  { kind: "agent", i: 4 },
  { kind: "agent", i: 5 },
  { kind: "callout", upto: 6 },
];

interface Props {
  ctx: Context | null;
  result: Analysis | null;
  onComplete: () => void;
}

export default function AgentStage({ ctx, result, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [t, setT] = useState(0);

  const cur: Step | undefined = SEQ[step];
  const stepMs = cur?.kind === "callout" ? (cur.upto === 6 ? 3600 : CALLOUT_MS) : AGENT_MS;

  useEffect(() => {
    if (!ctx) return;
    const i = setInterval(() => setT((x) => x + TICK), TICK);
    return () => clearInterval(i);
  }, [ctx, step]);

  useEffect(() => {
    if (t >= stepMs && step < SEQ.length) {
      setStep((x) => x + 1);
      setT(0);
    }
  }, [t, step, stepMs]);

  // the score only lands once Claude's narrative is genuinely back
  useEffect(() => {
    if (step < SEQ.length || !result) return;
    const to = setTimeout(onComplete, 2000);
    return () => clearTimeout(to);
  }, [step, result, onComplete]);

  const done = step >= SEQ.length;
  const agentIdx = cur?.kind === "agent" ? cur.i : 0;
  const stage = STAGES[agentIdx];
  const rows = useMemo(() => (ctx ? stage.rows(ctx) : []), [ctx, stage]);

  const collected =
    cur?.kind === "callout" ? cur.upto : cur?.kind === "agent" ? cur.i : STAGES.length;

  const thoughts = Math.max(0, Math.min(stage.thoughts.length, Math.floor((t - 250) / 900)));
  const shown = Math.max(0, Math.min(rows.length, Math.floor((t - 400) / 200)));
  const reveal = cur?.kind === "agent" && t >= 2500;

  const accent = cur?.kind === "agent" ? stage.accent : "#22d3ee";

  const label = done
    ? "Synthesising"
    : cur?.kind === "callout"
      ? "Everything so far"
      : "Reading Seapoint";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 overflow-hidden bg-[#0B1220]"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            `radial-gradient(900px 420px at 22% -6%, ${accent}26, transparent 62%), radial-gradient(760px 380px at 80% 6%, rgba(99,102,241,0.13), transparent 62%)`,
        }}
      />

      <div className="absolute inset-x-0 top-0 flex items-center gap-4 px-10 py-6">
        <div className="text-[13px] font-semibold tracking-tight text-slate-300">RunwayOS</div>
        <div className="h-3 w-px bg-white/10" />
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <div className="ml-auto flex items-center gap-5">
          <span className="tnum text-[11px] uppercase tracking-[0.18em] text-slate-500">
            {String(Math.min(collected, 6)).padStart(2, "0")} / 06 signals
          </span>
          <button
            onClick={onComplete}
            disabled={!result}
            className="text-[11px] uppercase tracking-[0.14em] text-slate-500 transition hover:text-slate-200 disabled:opacity-30"
          >
            Skip
          </button>
        </div>
      </div>

      <div className="mx-auto flex h-full max-w-[1400px] items-center px-10">
        {done ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto text-center"
          >
            <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10">
              <Sparkles size={24} className="text-emerald-300" />
            </div>
            <div className="text-[13px] uppercase tracking-[0.2em] text-emerald-300">Claude</div>
            <h2 className="mt-3 text-[40px] font-semibold leading-tight tracking-tight text-white">
              Scoring six dimensions
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-slate-400">
              {result
                ? "Writing the analysis for your audience."
                : "Waiting on the narrative from Claude…"}
            </p>
            <div className="mx-auto mt-8 h-px w-56 overflow-hidden bg-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
              />
            </div>
          </motion.div>
        ) : cur?.kind === "callout" ? (
          /* ---- pull back and show the whole board ---- */
          <motion.div
            key={`callout-${cur.upto}`}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45 }}
            className="w-full"
          >
            <div className="mb-8 text-center">
              <h2 className="text-[34px] font-semibold tracking-tight text-white">
                {cur.upto === 6 ? "Every signal is in" : "What we know so far"}
              </h2>
              <p className="mt-2 text-[14px] text-slate-400">
                {cur.upto} of 6 signals collected from Seapoint
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {STAGES.map((st, i) => {
                const got = i < cur.upto;
                return (
                  <motion.div
                    key={st.key}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.35 }}
                    className={`glass p-5 ${got ? "" : "opacity-40"}`}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <st.icon size={13} style={{ color: got ? st.accent : "#475569" }} />
                      <span className="text-[11.5px] font-medium text-slate-400">{st.role}</span>
                    </div>
                    <div className="tnum text-[32px] font-bold leading-none text-white">
                      {got && ctx ? st.big(ctx) : "—"}
                    </div>
                    <div className="mt-2 text-[11.5px] leading-snug text-slate-500">{st.unit}</div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <div className="grid w-full grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr,0.95fr] lg:gap-20">
            <AnimatePresence mode="wait">
              {!reveal ? (
                <motion.div
                  key={`${stage.key}-work`}
                  initial={{ opacity: 0, x: -28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.4 }}
                >
                  <div
                    className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border"
                    style={{ borderColor: `${accent}59`, backgroundColor: `${accent}1a` }}
                  >
                    <stage.icon size={22} style={{ color: accent }} />
                  </div>
                  <h2 className="text-[42px] font-semibold leading-[1.05] tracking-tight text-white">
                    {stage.role}
                  </h2>
                  <p className="mt-3 max-w-md text-[15px] leading-relaxed text-slate-400">
                    {stage.blurb}
                  </p>

                  <div className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                    <Terminal size={13} style={{ color: accent }} />
                    <span className="font-mono text-[12px] text-slate-300">{stage.tool}</span>
                    <span
                      className="h-1.5 w-1.5 animate-pulse rounded-full"
                      style={{ backgroundColor: accent }}
                    />
                  </div>

                  <div className="mt-7 space-y-1.5">
                    {stage.thoughts.slice(0, thoughts).map((th) => (
                      <motion.div
                        key={th}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="font-mono text-[11.5px] text-slate-500"
                      >
                        <span className="text-slate-600">›</span> {th}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={`${stage.key}-big`}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div
                    className="mb-3 flex items-center gap-2.5 text-[11px] uppercase tracking-[0.18em]"
                    style={{ color: accent }}
                  >
                    <stage.icon size={13} />
                    {stage.role}
                  </div>
                  <div className="tnum text-[92px] font-bold leading-none tracking-tight text-white">
                    {ctx ? stage.big(ctx) : "—"}
                  </div>
                  <div className="mt-3 text-[15px] font-medium text-slate-400">{stage.unit}</div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className="mt-6 max-w-md border-l-2 pl-4 text-[15px] leading-relaxed text-slate-300"
                    style={{ borderColor: `${accent}73` }}
                  >
                    {ctx ? stage.insight(ctx) : ""}
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              key={`${stage.key}-feed`}
              initial={{ opacity: 0, x: 26 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45 }}
              className="glass relative overflow-hidden p-6"
            >
              <motion.div
                className="pointer-events-none absolute inset-x-0 top-0 h-24"
                style={{ background: `linear-gradient(to bottom, ${accent}1f, transparent)` }}
                animate={{ y: ["-100%", "420%"] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: "linear" }}
              />
              <div className="mb-4 flex items-center gap-2.5">
                <Database size={13} style={{ color: accent }} />
                <span className="font-mono text-[11px] text-slate-400">{stage.resource}</span>
                <span className="tnum ml-auto text-[11px] text-slate-500">
                  {shown} / {rows.length}
                </span>
              </div>

              <div className="space-y-px">
                {rows.map((r, i) => (
                  <motion.div
                    key={r.label}
                    initial={{ opacity: 0, x: 22 }}
                    animate={i < shown ? { opacity: 1, x: 0 } : { opacity: 0, x: 22 }}
                    transition={{ duration: 0.32, ease: "easeOut" }}
                    className="flex items-center gap-4 border-b border-white/[0.05] py-2.5 last:border-0"
                  >
                    <span className="truncate text-[13px] text-slate-300">{r.label}</span>
                    <span className="tnum ml-auto shrink-0 text-[13px] font-semibold text-slate-100">
                      {r.value}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 px-10 pb-7">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2">
          {STAGES.map((st, i) => {
            const live = cur?.kind === "agent" && cur.i === i;
            const state = done || i < collected ? "done" : live ? "live" : "todo";
            return (
              <div key={st.key} className="flex-1">
                <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <motion.div
                    className="h-full"
                    style={{ backgroundColor: st.accent, opacity: 0.8 }}
                    initial={{ width: 0 }}
                    animate={{
                      width:
                        state === "done" ? "100%" : state === "live" ? `${(t / AGENT_MS) * 100}%` : 0,
                    }}
                    transition={{ duration: 0.12, ease: "linear" }}
                  />
                </div>
                <div
                  className="mt-2 truncate text-[10.5px] tracking-wide transition-colors"
                  style={{ color: live ? "#e2e8f0" : state === "done" ? "#64748b" : "#334155" }}
                >
                  {st.role}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
