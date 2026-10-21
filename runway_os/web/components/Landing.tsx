"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface Props {
  onRun: () => void;
  loading: boolean;
  stage: string;
}

export default function Landing({ onRun, loading, stage }: Props) {
  return (
    <div className="glass mx-auto max-w-2xl px-8 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-white">
        How healthy is this startup, really?
      </h1>
      <p className="mx-auto mt-4 max-w-md text-slate-400">
        One click. Claude queries Seapoint across six dimensions and scores financial health 0–100.
      </p>
      <div className="mt-10 flex min-h-[48px] items-center justify-center">
        {loading ? (
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin text-cyan-300" size={18} />
            <AnimatePresence mode="wait">
              <motion.span
                key={stage}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-slate-300"
              >
                {stage}
              </motion.span>
            </AnimatePresence>
          </div>
        ) : (
          <button
            type="button"
            onClick={onRun}
            className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-7 py-3 font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
          >
            Run Analysis
          </button>
        )}
      </div>
    </div>
  );
}
