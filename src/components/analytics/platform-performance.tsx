import { PlatformIcon } from "@/components/dashboard/platform-icon";
import type { AnalyticsOverview } from "@/lib/analytics/types";

interface PlatformPerformanceProps {
  platforms: AnalyticsOverview["platforms"];
}

function formatValue(value: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString();
}

export function PlatformPerformance({ platforms }: PlatformPerformanceProps) {
  if (platforms.length === 0) {
    return (
      <section className="rounded-lg border border-border/60 p-5 sm:p-6">
        <p className="text-xs font-medium text-muted-foreground">Platform performance</p>
        <p className="mt-4 text-sm text-muted-foreground">
          No platform performance data for this period.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border/60 p-5 sm:p-6">
      <p className="text-xs font-medium text-muted-foreground">Platform performance</p>
      <ul className="mt-4 divide-y divide-border/60">
        {platforms.map((platform) => (
          <li
            key={platform.platform}
            className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <PlatformIcon platform={platform.platform} size="sm" />
              <span className="text-sm font-medium capitalize text-foreground">
                {platform.platform}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Impressions</p>
                <p className="mt-1 font-medium text-foreground">
                  {formatValue(platform.impressions)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reach</p>
                <p className="mt-1 font-medium text-foreground">
                  {formatValue(platform.reach)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Engagement</p>
                <p className="mt-1 font-medium text-foreground">
                  {formatValue(platform.engagement)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
