"use client";

export function SkeletonDashboard() {
  return (
    <div className="mx-auto max-w-5xl space-y-10 px-6 py-8">
      <div className="flex justify-center">
        <div className="shimmer h-[280px] w-[280px] rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass shimmer h-40" />
        ))}
      </div>
    </div>
  );
}
