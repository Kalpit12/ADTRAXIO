"use client";

import { EvidenceBlock } from "@/components/copilot/evidence-block";

interface AnalyticsOverviewData {
  totals?: {
    impressions?: number | null;
    reach?: number | null;
    engagement?: number | null;
    followers?: number | null;
    publishedPosts?: number | null;
  };
  comparison?: {
    impressionsChange?: number | null;
    reachChange?: number | null;
    engagementChange?: number | null;
  };
  period?: { label?: string };
}

function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString();
}

function formatChange(value: number | null | undefined): string | null {
  if (value == null) return null;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}%`;
}

interface AnalyticsResultProps {
  data: AnalyticsOverviewData;
}

export function AnalyticsResult({ data }: AnalyticsResultProps) {
  const totals = data.totals;
  if (!totals) return null;

  const metrics = [
    { label: "Reach", value: totals.reach },
    { label: "Engagement", value: totals.engagement },
    { label: "Impressions", value: totals.impressions },
    { label: "Published", value: totals.publishedPosts },
  ].filter((m) => m.value != null);

  if (metrics.length === 0) return null;

  const changes = [
    { label: "Reach", value: data.comparison?.reachChange },
    { label: "Engagement", value: data.comparison?.engagementChange },
    { label: "Impressions", value: data.comparison?.impressionsChange },
  ].filter((c) => c.value != null);

  return (
    <EvidenceBlock source="analytics" title="Evidence · Analytics">
      {data.period?.label && (
        <p className="mb-3 text-xs text-muted-foreground">{data.period.label}</p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-0.5 font-heading text-lg tabular-nums text-foreground">
              {formatNumber(metric.value)}
            </p>
          </div>
        ))}
      </div>
      {changes.length > 0 && (
        <div className="mt-4 border-t border-border/40 pt-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Change vs prior period
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {changes.map((change) => {
              const formatted = formatChange(change.value);
              if (!formatted) return null;
              const positive = (change.value ?? 0) > 0;
              const negative = (change.value ?? 0) < 0;
              return (
                <span
                  key={change.label}
                  className={`text-xs tabular-nums ${
                    positive
                      ? "text-adtraxio-accent"
                      : negative
                        ? "text-red-400/80"
                        : "text-muted-foreground"
                  }`}
                >
                  {formatted} {change.label.toLowerCase()}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </EvidenceBlock>
  );
}
