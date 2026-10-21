"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { approve } from "@/lib/api";
import type { Proposal } from "@/lib/types";

type Status = "pending" | "approving" | "approved" | "error";

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

interface Props {
  proposal: Proposal;
  onApproved: (id: string, message: string) => void;
}

/** One proposed recategorisation. Writes only after an explicit click. */
export default function TransactionRow({ proposal, onApproved }: Props) {
  const [status, setStatus] = useState<Status>("pending");
  const [message, setMessage] = useState<string>("");

  async function handleApprove(): Promise<void> {
    setStatus("approving");
    try {
      const result = await approve(proposal.id, proposal.category_id);
      setMessage(result.message);
      if (result.ok) {
        setStatus("approved");
        onApproved(proposal.id, result.message);
      } else {
        setStatus("error");
      }
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Approval failed");
      setStatus("error");
    }
  }

  const motionProps = {
    layout: true,
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: "spring", stiffness: 260, damping: 26 },
  } as const;

  if (status === "approved") {
    return (
      <motion.div
        {...motionProps}
        className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-4 flex items-start gap-3"
      >
        <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="text-sm text-emerald-200 font-medium">
            Filed under {proposal.proposed_category}
          </div>
          <div className="text-[12.5px] text-emerald-300/70 mt-0.5">{message}</div>
        </div>
      </motion.div>
    );
  }

  if (status === "error") {
    return (
      <motion.div
        {...motionProps}
        className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-4 flex items-start gap-3"
      >
        <XCircle size={18} className="text-rose-400 mt-0.5 shrink-0" />
        <div className="flex-1 text-[13px] text-rose-200">{message}</div>
        <button
          type="button"
          onClick={() => setStatus("pending")}
          className="rounded-full px-4 py-2 text-sm font-semibold border border-rose-400/40 text-rose-100 hover:bg-rose-500/15 transition shrink-0"
        >
          Retry
        </button>
      </motion.div>
    );
  }

  const approving = status === "approving";

  return (
    <motion.div
      {...motionProps}
      className={`rounded-xl bg-white/[0.03] border border-white/10 p-4 flex items-start gap-4 ${
        approving ? "opacity-70" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold text-slate-100 tnum">
            {gbp.format(proposal.amount ?? 0)}
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-300 text-sm">{proposal.description ?? "Unknown counterparty"}</span>
        </div>
        <div className="text-[13px] text-slate-400 mt-1.5">
          Claude proposes:{" "}
          <span className="font-medium text-amber-200">{proposal.proposed_category}</span>
        </div>
        {proposal.reasoning ? (
          <p className="text-[12.5px] text-slate-500 leading-relaxed max-w-[70ch] mt-1.5">
            {proposal.reasoning}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={handleApprove}
        disabled={approving}
        className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold bg-amber-400 text-amber-950 hover:bg-amber-300 transition shrink-0 disabled:cursor-not-allowed"
      >
        {approving ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Approving…
          </>
        ) : (
          <>
            <Check size={14} />
            Approve
          </>
        )}
      </button>
    </motion.div>
  );
}
