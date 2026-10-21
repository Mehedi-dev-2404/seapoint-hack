"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import TransactionRow from "@/components/TransactionRow";
import type { Proposal } from "@/lib/types";

interface Props {
  proposals: Proposal[];
}

/** Agent-paused banner: lists proposals, each approved individually. */
export default function ApprovalBanner({ proposals }: Props) {
  const [approved, setApproved] = useState<Record<string, string>>({});

  if (proposals.length === 0) return null;

  const handleApproved = (id: string, message: string): void => {
    setApproved((prev) => ({ ...prev, [id]: message }));
  };

  const pending = proposals.filter((p) => !(p.id in approved)).length;
  const done = proposals.length - pending;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {pending > 0 ? (
        <motion.section
          key="paused"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-amber-500/30 border-l-4 border-l-amber-400 bg-amber-500/[0.07] p-5"
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={18} className="text-amber-300" />
            <h3 className="text-sm font-semibold text-amber-200">
              Agent paused — human approval required
            </h3>
            <span className="ml-auto rounded-full bg-amber-400/15 text-amber-200 text-[11px] px-2.5 py-1 tnum">
              {pending} pending
            </span>
          </div>
          <p className="text-[13px] text-amber-200/70 mt-1 max-w-[80ch]">
            These transactions sit in a catch-all category with unknown counterparties. Claude has
            proposed a category for each. Nothing is written to Seapoint until you approve.
          </p>
          <div className="space-y-2.5 mt-4">
            {proposals.map((p) => (
              <TransactionRow key={p.id} proposal={p} onApproved={handleApproved} />
            ))}
          </div>
        </motion.section>
      ) : (
        <motion.div
          key="done"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 flex items-center gap-2.5"
        >
          <ShieldCheck size={18} className="text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-200">All writes approved</span>
          <span className="text-[12.5px] text-emerald-300/70">
            {done} transaction{done === 1 ? "" : "s"} categorised
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
