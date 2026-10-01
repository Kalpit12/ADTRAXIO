export function WorkspaceListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading workspaces">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-md border border-border/40 bg-secondary/15"
        />
      ))}
    </div>
  );
}

export function WorkspaceMembersSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading members">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-md bg-secondary/20" />
      ))}
    </div>
  );
}
