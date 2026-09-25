import type { DataAvailability } from "@/lib/intelligence/types";

interface DataConfidenceProps {
  dataAvailability: DataAvailability | null;
  period: { from: string; to: string } | null;
  generatedAt: string | null;
  platforms: string[];
  contentAnalyzed: number;
  campaignsAnalyzed: number;
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DataConfidence({
  dataAvailability,
  period,
  generatedAt,
  platforms,
  contentAnalyzed,
  campaignsAnalyzed,
}: DataConfidenceProps) {
  return (
    <div className="rounded-lg border border-border/60 px-4 py-4">
      <p className="text-xs font-medium text-muted-foreground">Data context</p>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Period</dt>
          <dd className="mt-0.5 text-foreground">
            {period ? `${formatDate(period.from)} – ${formatDate(period.to)}` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Platforms analyzed</dt>
          <dd className="mt-0.5 capitalize text-foreground">
            {platforms.length > 0 ? platforms.join(", ") : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Content analyzed</dt>
          <dd className="mt-0.5 text-foreground">{contentAnalyzed}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Campaigns analyzed</dt>
          <dd className="mt-0.5 text-foreground">{campaignsAnalyzed}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Last generated</dt>
          <dd className="mt-0.5 text-foreground">
            {generatedAt ? new Date(generatedAt).toLocaleString() : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Data readiness</dt>
          <dd className="mt-0.5 text-foreground">
            {dataAvailability?.sufficientForRecommendations
              ? "Sufficient for recommendations"
              : dataAvailability?.sufficientForInsights
                ? "Limited sample"
                : "Insufficient"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
