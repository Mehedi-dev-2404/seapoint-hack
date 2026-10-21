import type { Analysis, ApproveResult, ModeKey, Context } from "@/lib/types";

export async function fetchAnalysis(mode: ModeKey): Promise<Analysis> {
  const res = await fetch(`/api/analyze?mode=${mode}`);
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as Analysis;
}

export async function approve(
  transaction_id: string,
  category_id: string,
): Promise<ApproveResult> {
  const res = await fetch("/api/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction_id, category_id }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as ApproveResult;
}

/** Sequentially prefetch modes (backend calls an LLM per mode); errors are swallowed. */
export function prefetchModes(
  modes: ModeKey[],
  onLoaded: (mode: ModeKey, a: Analysis) => void,
): void {
  void (async () => {
    for (const m of modes) {
      try {
        onLoaded(m, await fetchAnalysis(m));
      } catch {
        // ignore individual failures
      }
    }
  })();
}

export async function fetchContext(): Promise<Context> {
  const res = await fetch("/api/context");
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as Context;
}
