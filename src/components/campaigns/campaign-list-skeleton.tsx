export function CampaignListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading campaigns">
      <div className="h-10 w-64 animate-pulse rounded bg-secondary/30" />
      <div className="h-12 animate-pulse rounded-md border border-border/40 bg-secondary/20" />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-md border border-border/40 bg-secondary/15"
        />
      ))}
    </div>
  );
}
