"use client";

import { AlertCircle, ArrowRight } from "lucide-react";
import type { Anomaly } from "@/lib/types";

interface Props {
  anomalies: Anomaly[];
}

const SEVERITY_BORDER: Record<NonNullable<Anomaly["severity"]>, string> = {
  info: "border-l-2 border-transparent",
  warn: "border-l-2 border-amber-500/60",
  critical: "border-l-2 border-rose-500/70",
};

export default function AnomalyList({ anomalies }: Props) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Anomalies &amp; actions
      </h2>
      {anomalies.length === 0 ? (
        <div className="glass p-5 text-sm text-slate-500">No anomalies flagged.</div>
      ) : (
        <ul className="glass divide-y divide-white/5 px-4 py-1">
          {anomalies.map((a, i) => (
            <li
              key={i}
              className={`flex gap-3 px-1 py-3.5 ${SEVERITY_BORDER[a.severity ?? "info"]}`}
            >
              <span className="pl-2 text-base leading-5">
                {a.icon ? a.icon : <AlertCircle size={16} className="text-slate-500" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200">{a.description}</p>
                {a.action && (
                  <p className="mt-1 text-[13px] text-slate-400">
                    <ArrowRight size={12} className="mr-1 inline text-slate-500" />
                    {a.action}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
