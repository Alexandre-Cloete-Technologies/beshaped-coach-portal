"use client";

import Sidebar from "../../components/Sidebar";

export function NutritionSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-8" aria-busy="true" aria-label="Loading">
      <div className="mb-8 h-20 w-80 animate-pulse rounded-lg bg-muted/60" />
      {[0, 1].map((i) => (
        <div key={i} className="h-36 animate-pulse rounded-xl border border-border bg-muted/40" />
      ))}
    </div>
  );
}

export default function NutritionShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-[220px] min-h-screen">{children}</main>
    </div>
  );
}
