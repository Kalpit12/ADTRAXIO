export function PublishingSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading publishing">
      {[0, 1].map((section) => (
        <div key={section} className="space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-secondary/35" />
          <div className="rounded-md border border-border/50">
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="h-20 animate-pulse border-b border-border/40 bg-secondary/10 last:border-0"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
