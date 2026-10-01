const FIELDS = [
  { label: "Hook", tall: false },
  { label: "Headline", tall: false },
  { label: "Primary copy", tall: true },
  { label: "CTA", tall: false },
  { label: "Caption", tall: true },
  { label: "Hashtags", tall: false },
  { label: "Creative direction", tall: true },
];

interface GenerationSkeletonProps {
  label?: string;
}

export function GenerationSkeleton({
  label = "Generating content",
}: GenerationSkeletonProps) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-4">
      <p className="text-sm text-muted-foreground">{label}…</p>
      <div className="rounded-md border border-border/50 bg-adtraxio-surface/10 p-4 space-y-4">
        {FIELDS.map((field) => (
          <div key={field.label} className="space-y-2">
            <div className="h-3 w-20 animate-pulse rounded bg-secondary/40" />
            <div
              className={
                field.tall
                  ? "h-20 animate-pulse rounded bg-secondary/25"
                  : "h-9 animate-pulse rounded bg-secondary/25"
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
