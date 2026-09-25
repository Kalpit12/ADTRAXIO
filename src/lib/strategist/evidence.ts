import type { StrategistContextBundle } from "./context";
import type { StrategicEvidenceItem } from "./types";

export function buildEvidenceFromContext(
  bundle: StrategistContextBundle
): StrategicEvidenceItem[] {
  const items: StrategicEvidenceItem[] = [];

  for (const change of bundle.facts.metricChanges.slice(0, 6)) {
    items.push({
      metric: change.metric,
      value: String(
        change.changePercent != null ? `${change.changePercent}%` : change.current ?? "n/a"
      ),
      period: bundle.facts.periodLabel,
      source: "analytics_daily",
      interpretation: "measured",
    });
  }

  for (const row of bundle.topContent.slice(0, 3)) {
    items.push({
      metric: `Top content engagement (${row.platform})`,
      value: String(row.engagement ?? "n/a"),
      period: "Last 30 days",
      source: "content_performance",
      interpretation: "observed",
    });
  }

  if (bundle.connectedPlatforms.length) {
    items.push({
      metric: "Connected platforms",
      value: bundle.connectedPlatforms.join(", "),
      period: "current",
      source: "social_accounts",
      interpretation: "measured",
    });
  }

  items.push({
    metric: "Active campaigns",
    value: String(bundle.campaignCount),
    period: "current",
    source: "campaigns",
    interpretation: "measured",
  });

  items.push({
    metric: "Scheduled posts upcoming",
    value: String(bundle.scheduledUpcoming),
    period: "current",
    source: "scheduled_posts",
    interpretation: "measured",
  });

  if (bundle.growthBrief) {
    items.push({
      metric: "Growth brief summary",
      value: bundle.growthBrief.summary.slice(0, 200),
      period: bundle.growthBrief.metrics?.periodLabel ?? "recent",
      source: "ai_growth_briefs",
      interpretation: "observed",
    });
  }

  for (const gap of bundle.dataGaps.slice(0, 3)) {
    items.push({
      metric: "Data gap",
      value: gap,
      period: "current",
      source: "system",
      interpretation: "observed",
    });
  }

  return items;
}
