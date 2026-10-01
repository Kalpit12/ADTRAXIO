import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { formatMetricValue } from "@/lib/analytics/display";
import type { AnalyticsOverview } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

interface PlatformPerformanceProps {
  platforms: AnalyticsOverview["platforms"];
}

function MetricCell({
  label,
  value,
  dimmed,
}: {
  label: string;
  value: number | null;
  dimmed?: boolean;
}) {
  return (
    <div className={cn(dimmed && "opacity-70")}>
      <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 tabular-nums text-sm font-medium text-foreground">
        {formatMetricValue(value)}
      </p>
    </div>
  );
}

export function PlatformPerformance({ platforms }: PlatformPerformanceProps) {
  if (platforms.length === 0) {
    return (
      <section className="rounded-lg border border-border/60 bg-adtraxio-surface/10 px-5 py-6 sm:px-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
          Where
        </p>
        <h2 className="font-heading mt-1 text-lg tracking-tight text-foreground">
          Platform breakdown
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          No platform breakdown for this period. Connect Instagram or Facebook
          and refresh data after publishing.
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border border-border/60 bg-adtraxio-surface/10"
      aria-labelledby="platform-breakdown-title"
    >
      <div className="border-b border-border/50 px-5 py-4 sm:px-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
          Where
        </p>
        <h2
          id="platform-breakdown-title"
          className="font-heading text-lg tracking-tight text-foreground"
        >
          Platform breakdown
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare connected platforms for the selected range.
        </p>
      </div>

      <ul className="divide-y divide-border/50">
        {platforms.map((platform) => {
          const noData = !platform.hasData;

          return (
            <li
              key={platform.platform}
              className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              <div className="flex min-w-0 items-center gap-3">
                <PlatformIcon platform={platform.platform} size="sm" />
                <div>
                  <p className="text-sm font-medium capitalize text-foreground">
                    {platform.platform}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {noData
                      ? "No data for this period"
                      : "Metrics available"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 sm:gap-8">
                <MetricCell
                  label="Impressions"
                  value={platform.impressions}
                  dimmed={noData}
                />
                <MetricCell
                  label="Reach"
                  value={platform.reach}
                  dimmed={noData}
                />
                <MetricCell
                  label="Engagement"
                  value={platform.engagement}
                  dimmed={noData}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
