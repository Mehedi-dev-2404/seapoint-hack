"use client";

import DimensionCard from "@/components/DimensionCard";
import type { Dimension } from "@/lib/types";

interface Props {
  dims: Dimension[];
}

export default function DimensionGrid({ dims }: Props) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Score breakdown
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dims.map((d, i) => (
          <DimensionCard key={d.key} dim={d} index={i} />
        ))}
      </div>
    </section>
  );
}
