"use client";

import { Rocket } from "lucide-react";

export default function Header({ source }: { source: string }) {
  const live = source.toLowerCase().includes("live");
  return (
    <header className="flex items-center justify-between px-6 py-5 md:px-10">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500">
          <Rocket size={16} className="text-white" />
        </div>
        <span className="font-semibold tracking-tight text-white">RunwayOS</span>
        <span className="text-xs text-slate-500">for Seapoint</span>
      </div>
      <div className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-slate-300">
        <span className="relative flex h-2 w-2">
          {live && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              live ? "bg-emerald-400" : "bg-amber-400"
            }`}
          />
        </span>
        {live ? "Seapoint MCP live" : "Seapoint snapshot"}
      </div>
    </header>
  );
}
