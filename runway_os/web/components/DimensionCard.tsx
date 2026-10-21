"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { AlertOctagon, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BAND_HEX } from "@/lib/types";
import type { Dimension, Flag } from "@/lib/types";

const FLAG_STYLE: Record<Flag, { text: string; cls: string; Icon: LucideIcon }> = {
  confident: {
    text: "Confident",
    cls: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
    Icon: CheckCircle2,
  },
  review: {
    text: "Review Suggested",
    cls: "bg-amber-500/15 text-amber-300 border border-amber-500/20",
    Icon: AlertTriangle,
  },
  act_now: {
    text: "Act Now",
    cls: "bg-rose-500/15 text-rose-300 border border-rose-500/20",
    Icon: AlertOctagon,
  },
};

function dimColor(score: number): string {
  return score >= 16 ? BAND_HEX.emerald : score >= 12 ? BAND_HEX.amber : BAND_HEX.rose;
}

function fmt(v: number): string {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

interface Props {
  dim: Dimension;
  index: number;
}

export default function DimensionCard({ dim, index }: Props) {
  const { score } = dim;
  const flag = FLAG_STYLE[dim.flag];
  const FlagIcon = flag.Icon;

  const value = useMotionValue(0);
  const display = useTransform(value, (v) => fmt(v));

  useEffect(() => {
    if (score === null) return;
    const controls = animate(value, score, { duration: 0.9, ease: "easeOut" });
    return () => controls.stop();
  }, [score, value]);

  const color = score === null ? undefined : dimColor(score);
  const pct = score === null ? 0 : Math.max(0, Math.min(100, (score / 20) * 100));

  return (
    <motion.div
      className="glass flex min-h-[180px] flex-col p-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{dim.icon}</span>
        <span className="text-sm font-semibold text-slate-200">{dim.label}</span>
        {score === null ? (
          <span className="ml-auto text-sm font-bold text-slate-500 tnum">n/a</span>
        ) : (
          <span className="ml-auto text-sm font-bold tnum" style={{ color }}>
            <motion.span>{display}</motion.span>/20
          </span>
        )}
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: "easeOut", delay: index * 0.06 }}
        />
      </div>

      <p className="mt-3 line-clamp-3 flex-1 text-[13px] leading-relaxed text-slate-400">
        {dim.insight}
      </p>

      <span
        className={`mt-3 inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[11px] font-semibold ${flag.cls}`}
      >
        <FlagIcon size={12} />
        {flag.text}
      </span>
    </motion.div>
  );
}
