"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, FileDown } from "lucide-react";

import AgentStage from "@/components/AgentStage";
import AgentLog from "@/components/AgentLog";
import AnomalyList from "@/components/AnomalyList";
import ApprovalBanner from "@/components/ApprovalBanner";
import DimensionGrid from "@/components/DimensionGrid";
import Header from "@/components/Header";
import Landing from "@/components/Landing";
import ModeSwitcher from "@/components/ModeSwitcher";
import NarrativeCard from "@/components/NarrativeCard";
import ScoreGauge from "@/components/ScoreGauge";
import { SkeletonDashboard } from "@/components/Skeleton";
import { fetchAnalysis, fetchContext, prefetchModes } from "@/lib/api";
import { MODE_ORDER, type Analysis, type Context, type ModeKey } from "@/lib/types";

const STAGES = [
  "Querying Seapoint…",
  "Scoring 6 dimensions…",
  "Claude is writing your narrative…",
];

export default function Page() {
  const [mode, setMode] = useState<ModeKey>("investor");
  const [results, setResults] = useState<Partial<Record<ModeKey, Analysis>>>({});
  const [phase, setPhase] = useState<"idle" | "crew" | "ready">("idle");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(STAGES[0]);
  const [ctx, setCtx] = useState<Context | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prefetched = useRef(false);

  // staged loader text while the first analysis runs
  useEffect(() => {
    if (!loading) return;
    let i = 0;
    const t = setInterval(() => {
      i = Math.min(i + 1, STAGES.length - 1);
      setStage(STAGES[i]);
    }, 2600);
    return () => clearInterval(t);
  }, [loading]);

  const run = useCallback(async () => {
    setLoading(true);
    setPhase("crew");
    setStage(STAGES[0]);
    setError(null);
    fetchContext().then(setCtx).catch(() => undefined);
    try {
      const first = await fetchAnalysis(mode);
      setResults((r) => ({ ...r, [mode]: first }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  // once the first result is in, quietly warm the other three so switching is instant
  useEffect(() => {
    if (prefetched.current || !results[mode]) return;
    prefetched.current = true;
    prefetchModes(
      MODE_ORDER.filter((m) => m !== mode),
      (m, a) => setResults((r) => ({ ...r, [m]: a })),
    );
  }, [results, mode]);

  // switching to a mode that is not warm yet fetches it on demand
  useEffect(() => {
    if (phase === "idle" || results[mode]) return;
    let cancelled = false;
    fetchAnalysis(mode)
      .then((a) => !cancelled && setResults((r) => ({ ...r, [mode]: a })))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [mode, phase, results]);

  const current = results[mode];
  const crewResult = results.investor ?? current ?? null;

  return (
    <main className="mx-auto w-full max-w-[1140px] px-6 py-7">
      <Header source={current?.data_source ?? "snapshot"} />

      {phase === "idle" ? (
        <div className="mt-20 flex justify-center">
          <Landing onRun={run} loading={loading} stage={stage} />
        </div>
      ) : phase === "crew" ? (
        <AgentStage ctx={ctx} result={crewResult} onComplete={() => setPhase("ready")} />
      ) : (
        <>
          <div className="mt-8 flex items-center gap-3">
            <div className="hidden flex-1 md:block" />
            <ModeSwitcher mode={mode} onChange={setMode} disabled={loading} />
            <div className="flex flex-1 justify-end">
              <button
                onClick={() => window.open(`/report/${mode}`, "_blank")}
                disabled={!current}
                className="glass flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium text-slate-300 transition hover:text-white disabled:opacity-40"
                title={`Export the ${mode} report as a PDF`}
              >
                <FileDown size={14} />
                <span className="hidden sm:inline">Export report</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-[13px] text-rose-200">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-300" />
              <span>{error}</span>
            </div>
          )}

          {!current ? (
            <div className="mt-10">
              <SkeletonDashboard />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28 }}
                className="space-y-10"
              >
                <section className="mt-2">
                  <ScoreGauge
                    score={current.overall_score}
                    label={current.label}
                    headline={current.headline}
                  />
                </section>

                {current.claude_error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-[13px] text-amber-200">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" />
                    <span>
                      Claude step unavailable ({current.claude_error}). Showing computed metrics only.
                    </span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {current && (
            <div className="mt-10">
              <ApprovalBanner proposals={current.uncategorised_transactions ?? []} />
            </div>
          )}

          {current && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${mode}-body`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28 }}
                className="mt-10 space-y-10"
              >
                <DimensionGrid dims={current.dimensions ?? []} />

                <NarrativeCard narrative={current.narrative ?? ""} mode={mode} />

                <AnomalyList anomalies={current.anomalies ?? []} />

                <AgentLog log={current.agent_log ?? []} source={current.data_source ?? ""} />
              </motion.div>
            </AnimatePresence>
          )}
        </>
      )}

      <footer className="mt-14 pb-6 text-center text-[11px] text-slate-600">
        RunwayOS · financial health scored on Seapoint data · narrative by Claude
      </footer>
    </main>
  );
}
