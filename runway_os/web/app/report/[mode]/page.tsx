"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";

import { fetchAnalysis } from "@/lib/api";
import { MODE_LABEL, MODE_ORDER, type Analysis, type ModeKey } from "@/lib/types";

const BAND = (s: number) => (s >= 80 ? "#047857" : s >= 60 ? "#b45309" : "#be123c");
const DIM_BAND = (s: number) => (s >= 16 ? "#047857" : s >= 12 ? "#b45309" : "#be123c");
const FLAG_TEXT: Record<string, string> = {
  confident: "Confident",
  review: "Review suggested",
  act_now: "Act now",
};

export default function ReportPage() {
  const params = useParams<{ mode: string }>();
  const raw = (params?.mode ?? "investor").toLowerCase();
  const mode = (MODE_ORDER.includes(raw as ModeKey) ? raw : "investor") as ModeKey;

  const [data, setData] = useState<Analysis | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const printed = useState({ done: false })[0];

  useEffect(() => {
    document.body.style.background = "#ffffff";
    return () => {
      document.body.style.background = "";
    };
  }, []);

  useEffect(() => {
    fetchAnalysis(mode)
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [mode]);

  // open the browser's Save-as-PDF dialog once the report has painted
  useEffect(() => {
    if (!data || printed.done) return;
    printed.done = true;
    const t = setTimeout(() => window.print(), 700);
    return () => clearTimeout(t);
  }, [data, printed]);

  if (err) return <div className="p-10 font-sans text-sm text-rose-700">Could not load report: {err}</div>;
  if (!data) return <div className="p-10 font-sans text-sm text-neutral-500">Preparing report…</div>;

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-[760px] bg-white px-12 py-10 font-sans text-neutral-900 print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 16mm; } @media print { .no-print { display: none !important; } }`}</style>

      <button
        onClick={() => window.print()}
        className="no-print fixed right-6 top-6 flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-neutral-700"
      >
        <Printer size={14} /> Save as PDF
      </button>

      {/* letterhead */}
      <header className="flex items-baseline justify-between border-b-2 border-neutral-900 pb-3">
        <div>
          <div className="text-[19px] font-bold tracking-tight">RunwayOS</div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
            Financial health report
          </div>
        </div>
        <div className="text-right text-[11px] leading-5 text-neutral-500">
          <div>Prepared for: {MODE_LABEL[mode]}</div>
          <div>{today}</div>
        </div>
      </header>

      {/* score */}
      <section className="mt-7 flex items-start gap-7">
        <div
          className="flex h-[104px] w-[104px] shrink-0 flex-col items-center justify-center rounded-full border-[5px]"
          style={{ borderColor: BAND(data.overall_score) }}
        >
          <div
            className="text-[38px] font-bold leading-none tnum"
            style={{ color: BAND(data.overall_score) }}
          >
            {data.overall_score}
          </div>
          <div className="mt-0.5 text-[9px] uppercase tracking-widest text-neutral-400">/ 100</div>
        </div>
        <div className="pt-1">
          <div
            className="text-[13px] font-bold uppercase tracking-[0.14em]"
            style={{ color: BAND(data.overall_score) }}
          >
            {data.label}
          </div>
          <p className="mt-1.5 text-[17px] font-semibold leading-snug text-neutral-900">
            {data.headline}
          </p>
        </div>
      </section>

      {/* dimensions */}
      <section className="mt-8 break-inside-avoid">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
          Score breakdown
        </h2>
        <table className="w-full border-collapse text-[12px]">
          <tbody>
            {data.dimensions.map((d) => (
              <tr key={d.key} className="border-b border-neutral-200 align-top">
                <td className="w-[150px] py-2.5 pr-3 font-semibold text-neutral-900">{d.label}</td>
                <td className="w-[52px] py-2.5 pr-3 text-right font-bold tnum"
                    style={{ color: d.score === null ? "#9ca3af" : DIM_BAND(d.score) }}>
                  {d.score === null ? "n/a" : `${d.score}/20`}
                </td>
                <td className="py-2.5 pr-3 leading-relaxed text-neutral-700">{d.insight}</td>
                <td className="w-[104px] py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-wide"
                    style={{ color: d.flag === "confident" ? "#047857" : d.flag === "review" ? "#b45309" : "#be123c" }}>
                  {FLAG_TEXT[d.flag] ?? d.flag}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* narrative */}
      <section className="mt-8 break-inside-avoid">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
          Analysis for your {MODE_LABEL[mode].toLowerCase()}
        </h2>
        <div className="space-y-3">
          {data.narrative
            .split("\n")
            .filter((p) => p.trim())
            .map((p, i) => (
              <p key={i} className="text-[12.5px] leading-6 text-neutral-800">
                {p}
              </p>
            ))}
        </div>
      </section>

      {/* anomalies */}
      {data.anomalies.length > 0 && (
        <section className="mt-8 break-inside-avoid">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
            Anomalies &amp; recommended actions
          </h2>
          <ul className="space-y-2.5">
            {data.anomalies.map((a, i) => (
              <li key={i} className="border-l-2 border-neutral-300 pl-3">
                <div className="text-[12.5px] font-semibold text-neutral-900">{a.description}</div>
                <div className="text-[12px] leading-5 text-neutral-600">→ {a.action}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* pending approvals */}
      {data.uncategorised_transactions.length > 0 && (
        <section className="mt-8 break-inside-avoid">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
            Awaiting human approval
          </h2>
          <p className="mb-2 text-[11.5px] text-neutral-500">
            The agent proposed a category for each of these and stopped. Nothing was written to Seapoint
            without a person approving it.
          </p>
          <table className="w-full border-collapse text-[11.5px]">
            <tbody>
              {data.uncategorised_transactions.map((p) => (
                <tr key={p.id} className="border-b border-neutral-200">
                  <td className="w-[74px] py-1.5 font-semibold tnum">
                    £{(p.amount ?? 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1.5 pr-3 text-neutral-700">{p.description}</td>
                  <td className="py-1.5 text-right text-neutral-600">{p.proposed_category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* method */}
      <section className="mt-8 break-inside-avoid border-t border-neutral-200 pt-4">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
          Method &amp; sources
        </h2>
        <p className="text-[11px] leading-5 text-neutral-500">
          Figures in GBP, drawn from {data.data_source}. The six dimension scores are computed
          deterministically from those figures and are identical across all four audience reports; only the
          written analysis is rewritten per audience by Claude. Treat this as a working document, not
          audited accounts.
        </p>
        <ul className="mt-2 space-y-0.5">
          {data.agent_log.map((l, i) => (
            <li key={i} className="font-mono text-[10px] text-neutral-400">
              {l.tool} — {l.summary}
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-6 border-t border-neutral-200 pt-3 text-[10px] text-neutral-400">
        RunwayOS · financial health scored on Seapoint data · narrative by Claude · generated {today}
      </footer>
    </div>
  );
}
