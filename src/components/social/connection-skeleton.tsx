export function ConnectionSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading connections">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-4 rounded-md border border-border/50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex gap-3">
            <div className="size-10 shrink-0 animate-pulse rounded-md bg-secondary/30" />
            <div className="space-y-2">
              <div className="h-4 w-40 animate-pulse rounded bg-secondary/30" />
              <div className="h-3 w-28 animate-pulse rounded bg-secondary/20" />
            </div>
          </div>
          <div className="h-8 w-24 animate-pulse rounded bg-secondary/20" />
        </div>
      ))}
    </div>
  );
}
