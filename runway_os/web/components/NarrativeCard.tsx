"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MODE_ACCENT, MODE_LABEL } from "@/lib/types";
import type { ModeKey } from "@/lib/types";

interface Props {
  narrative: string;
  mode: ModeKey;
}

export default function NarrativeCard({ narrative, mode }: Props) {
  const paragraphs = narrative.split("\n").filter((p) => p.trim().length > 0);
  return (
    <div className="glass p-7">
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
        >
          <div
            className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${MODE_ACCENT[mode].text}`}
          >
            For your {MODE_LABEL[mode]}
          </div>
          <div className="mt-4 space-y-4">
            {paragraphs.map((p, i) => (
              <p key={i} className="max-w-[65ch] text-[15px] leading-7 text-slate-300">
                {p}
              </p>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
