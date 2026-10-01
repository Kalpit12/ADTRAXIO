import { formatMetricValue } from "@/lib/analytics/display";
import { cn } from "@/lib/utils";

interface MetricSummaryProps {
  impressions: number | null;
  reach: number | null;
  engagement: number | null;
  followers: number | null;
}

export function MetricSummary({
  impressions,
  reach,
  engagement,
  followers,
}: MetricSummaryProps) {
  const items = [
    {
      label: "Impressions",
      value: impressions,
      hint: "Times content was shown",
      emphasize: false,
    },
    {
      label: "Reach",
      value: reach,
      hint: "Unique accounts reached",
      emphasize: false,
    },
    {
      label: "Engagement",
      value: engagement,
      hint: "Interactions in period",
      emphasize: true,
    },
    {
      label: "Followers",
      value: followers,
      hint: "Current audience size",
      emphasize: false,
    },
  ];

  return (
    <div className="rounded-lg border border-border/60 bg-adtraxio-surface/10">
      <dl className="grid divide-y divide-border/50 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              "px-5 py-5 sm:px-6 sm:py-6",
              item.emphasize && "bg-white/[0.02]"
            )}
          >
            <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {item.label}
            </dt>
            <dd
              className={cn(
                "mt-2 font-heading tabular-nums tracking-tight text-foreground",
                item.emphasize
                  ? "text-3xl sm:text-4xl"
                  : "text-2xl sm:text-3xl"
              )}
            >
              {formatMetricValue(item.value)}
            </dd>
            <dd className="mt-1.5 text-xs text-muted-foreground/90">
              {item.value == null ? "Unavailable for this view" : item.hint}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
