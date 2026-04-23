"use client";

/**
 * Shown while the program library fetches from Firestore.
 * Matches the ProgramCard grid layout.
 */
export default function ProgramsListSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-hidden
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="h-5 w-[78%] animate-pulse rounded-md bg-muted" />
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-md bg-muted" />
          </div>
          <div className="mb-2 h-3 w-1/2 animate-pulse rounded bg-muted/80" />
          <div className="mb-2 h-3 w-full animate-pulse rounded bg-muted/60" />
          <div className="mb-2 h-3 w-5/6 animate-pulse rounded bg-muted/60" />
          <div className="mt-4 flex gap-2">
            <div className="h-6 w-16 animate-pulse rounded-full bg-muted/70" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-muted/70" />
          </div>
          <div className="mt-4 h-9 w-full animate-pulse rounded-lg bg-muted/50" />
        </div>
      ))}
    </div>
  );
}
