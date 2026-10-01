export function BillingSkeleton() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading billing">
      <div className="space-y-3 border-b border-border/60 pb-7">
        <div className="h-3 w-16 animate-pulse rounded bg-secondary/25" />
        <div className="h-9 max-w-md animate-pulse rounded bg-secondary/25" />
        <div className="h-4 max-w-lg animate-pulse rounded bg-secondary/20" />
      </div>
      <div className="h-40 animate-pulse rounded-md border border-border/40 bg-secondary/15" />
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-72 animate-pulse rounded-md border border-border/40 bg-secondary/15"
          />
        ))}
      </div>
    </div>
  );
}
