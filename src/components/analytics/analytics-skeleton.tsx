export function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading analytics">
      <div className="space-y-3 border-b border-border/60 pb-7">
        <div className="h-3 w-24 animate-pulse rounded bg-secondary/40" />
        <div className="h-9 w-48 animate-pulse rounded bg-secondary/40" />
        <div className="h-4 w-full max-w-md animate-pulse rounded bg-secondary/30" />
        <div className="mt-4 flex gap-2">
          <div className="h-9 w-56 animate-pulse rounded-md bg-secondary/35" />
          <div className="h-9 w-32 animate-pulse rounded-md bg-secondary/35" />
        </div>
      </div>

      <div className="rounded-lg border border-border/50 p-1">
        <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2 px-5 py-6">
              <div className="h-3 w-20 animate-pulse rounded bg-secondary/35" />
              <div className="h-8 w-28 animate-pulse rounded bg-secondary/45" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border/50 px-5 py-5 sm:px-6">
        <div className="flex justify-between gap-4">
          <div className="h-5 w-32 animate-pulse rounded bg-secondary/35" />
          <div className="h-8 w-48 animate-pulse rounded-md bg-secondary/30" />
        </div>
        <div className="mt-6 h-[260px] animate-pulse rounded-md bg-secondary/25" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-48 animate-pulse rounded-lg border border-border/50 bg-secondary/15" />
        <div className="h-48 animate-pulse rounded-lg border border-border/50 bg-secondary/15" />
      </div>

      <div className="rounded-lg border border-border/50 px-5 py-5">
        <div className="h-5 w-40 animate-pulse rounded bg-secondary/35" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-secondary/20" />
          ))}
        </div>
      </div>
    </div>
  );
}
