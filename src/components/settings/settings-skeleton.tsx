export function SettingsSkeleton() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading settings">
      <div className="space-y-3 border-b border-border/60 pb-7">
        <div className="h-3 w-20 animate-pulse rounded bg-secondary/25" />
        <div className="h-9 max-w-xs animate-pulse rounded bg-secondary/25" />
        <div className="h-4 max-w-md animate-pulse rounded bg-secondary/20" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-3">
          <div className="h-3 w-24 animate-pulse rounded bg-secondary/20" />
          <div className="h-24 animate-pulse rounded-md border border-border/40 bg-secondary/15" />
        </div>
      ))}
    </div>
  );
}
