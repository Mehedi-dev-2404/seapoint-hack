"use client";

import { useEffect, useId } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { band, BAND_HEX } from "@/lib/types";

const SIZE = 280;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const BAND_LIGHT: Record<"emerald" | "amber" | "rose", string> = {
  emerald: "#6ee7b7",
  amber: "#fcd34d",
  rose: "#fda4af",
};

interface Props {
  score: number;
  label: string;
  headline: string;
}

export default function ScoreGauge({ score, label, headline }: Props) {
  const gradId = `gauge-grad-${useId().replace(/:/g, "")}`;
  const b = band(score);
  const color = BAND_HEX[b];
  const clamped = Math.max(0, Math.min(100, score));

  const value = useMotionValue(0);
  const rounded = useTransform(value, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(value, score, { duration: 1.2, ease: EASE });
    return () => controls.stop();
  }, [score, value]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity={1} />
              <stop offset="100%" stopColor={BAND_LIGHT[b]} stopOpacity={1} />
            </linearGradient>
          </defs>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={STROKE}
          />
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            initial={{ strokeDashoffset: CIRC }}
            animate={{ strokeDashoffset: CIRC * (1 - clamped / 100) }}
            transition={{ duration: 1.2, ease: EASE }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-[72px] font-bold leading-none tnum"
            style={{ color }}
          >
            {rounded}
          </motion.span>
          <span className="mt-2 text-xs uppercase tracking-widest text-slate-500">
            out of 100
          </span>
        </div>
      </div>
      <div className="mt-6 text-lg font-semibold" style={{ color }}>
        {label}
      </div>
      <p className="mt-3 max-w-2xl text-center text-xl font-medium leading-snug text-slate-200">
        {headline}
      </p>
      <p className="mt-4 text-xs text-slate-600">Powered by Claude + Seapoint</p>
    </div>
  );
}
