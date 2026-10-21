export type Flag = "confident" | "review" | "act_now";

export interface Dimension {
  key: string;
  label: string;
  icon: string;
  score: number | null;
  flag: Flag;
  detail: string;
  insight: string;
}

export interface Anomaly {
  icon?: string;
  description?: string;
  action?: string;
  severity?: "info" | "warn" | "critical";
}

export interface Proposal {
  id: string;
  description?: string;
  amount?: number;
  proposed_category: string;
  category_id: string;
  reasoning?: string;
}

export interface LogEntry {
  tool: string;
  summary: string;
}

export interface Analysis {
  mode: string;
  overall_score: number;
  label: string;
  headline: string;
  dimensions: Dimension[];
  narrative: string;
  anomalies: Anomaly[];
  uncategorised_transactions: Proposal[];
  confidence_flags: Record<string, Flag>;
  metrics: Record<string, number | string | null>;
  agent_log: LogEntry[];
  data_source: string;
  claude_error: string | null;
}

export interface ApproveResult {
  ok: boolean;
  simulated: boolean;
  message: string;
}

export type ModeKey = "investor" | "hiring" | "partner" | "founder";

export const MODE_ORDER: ModeKey[] = ["investor", "hiring", "partner", "founder"];

export const MODE_LABEL: Record<ModeKey, string> = {
  investor: "Investor",
  hiring: "Hiring",
  partner: "Partner",
  founder: "Founder",
};

/** One accent per audience mode. */
export const MODE_ACCENT: Record<ModeKey, { from: string; to: string; text: string; glow: string }> = {
  investor: { from: "#22d3ee", to: "#0891b2", text: "text-cyan-300", glow: "34,211,238" },
  hiring: { from: "#34d399", to: "#059669", text: "text-emerald-300", glow: "52,211,153" },
  partner: { from: "#a78bfa", to: "#7c3aed", text: "text-violet-300", glow: "167,139,250" },
  founder: { from: "#fb923c", to: "#ea580c", text: "text-orange-300", glow: "251,146,60" },
};

export function band(score: number): "emerald" | "amber" | "rose" {
  return score >= 80 ? "emerald" : score >= 60 ? "amber" : "rose";
}

export const BAND_HEX: Record<"emerald" | "amber" | "rose", string> = {
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
};

export interface CtxAccount { name: string; type: string; gbp: number }
export interface CtxVendor { name: string; spend: number; txns: number; category?: string }
export interface CtxFlagged { id: string; date: string; amount: number; description: string }

export interface Context {
  source: string;
  metrics: Record<string, number | string | null>;
  accounts: CtxAccount[];
  categories: { name: string; amount: number }[];
  months: { month: string; amount: number }[];
  vendors: CtxVendor[];
  vendor_count: number | null;
  invoices: {
    unpaid?: { count: number; total_gbp: number; earliest_due?: string };
    overdue?: { count: number; total_gbp: number };
    paid?: { count: number; total_gbp: number };
    all_total_gbp?: number;
  };
  flagged: CtxFlagged[];
}
