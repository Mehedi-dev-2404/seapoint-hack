"use client";

import { motion } from "framer-motion";
import { MODE_ACCENT, MODE_LABEL, MODE_ORDER } from "@/lib/types";
import type { ModeKey } from "@/lib/types";

interface Props {
  mode: ModeKey;
  onChange: (m: ModeKey) => void;
  disabled?: boolean;
}

export default function ModeSwitcher({ mode, onChange, disabled }: Props) {
  return (
    <div className="glass inline-flex rounded-full p-1">
      {MODE_ORDER.map((m) => {
        const active = m === mode;
        const accent = MODE_ACCENT[m];
        return (
          <button
            key={m}
            type="button"
            disabled={disabled}
            onClick={() => onChange(m)}
            className={`relative rounded-full px-5 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              active ? "text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {active && (
              <motion.div
                layoutId="mode-pill"
                className="absolute inset-0 rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className={`relative z-10 ${active ? "font-semibold" : "font-medium"}`}>
              {MODE_LABEL[m]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
