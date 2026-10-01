export function ReportListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading reports">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-md border border-border/40 bg-secondary/15" />
      ))}
    </div>
  );
}
