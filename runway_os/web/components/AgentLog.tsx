"use client";

import { ChevronDown, Terminal } from "lucide-react";
import type { LogEntry } from "@/lib/types";

interface Props {
  log: LogEntry[];
  source: string;
}

export default function AgentLog({ log, source }: Props) {
  return (
    <details className="glass group p-4">
      <summary className="flex cursor-pointer select-none list-none items-center gap-2 text-sm text-slate-300 [&::-webkit-details-marker]:hidden">
        <Terminal size={14} className="text-slate-500" />
        Agent log
        <ChevronDown
          size={14}
          className="ml-auto text-slate-500 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-3 overflow-x-auto rounded-lg bg-black/20 p-3 font-mono text-[11.5px] leading-relaxed text-slate-400">
        <div>source: {source}</div>
        {log.map((e, i) => (
          <div key={i} className="whitespace-pre-wrap">
            ▸ <span className="text-slate-200">{e.tool}</span> — {e.summary}
          </div>
        ))}
      </div>
    </details>
  );
}
