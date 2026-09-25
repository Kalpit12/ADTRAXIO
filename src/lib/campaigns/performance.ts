import { engagementRate } from "@/lib/analytics/capabilities";
import type { CampaignPerformance, CampaignPerformanceSummary } from "./types";

type ContentAnalyticsRow = {
  content_id: string | null;
  scheduled_post_id: string | null;
  platform: string;
  metric_date: string;
  impressions: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  engagement_rate: number | null;
};

type ContentMeta = {
  id: string;
  headline: string | null;
};

function sumNullable(values: Array<number | null>): number | null {
  const present = values.filter((v): v is number => v != null);
  if (present.length === 0) return null;
  return present.reduce((acc, value) => acc + value, 0);
}

function rowEngagement(row: ContentAnalyticsRow): number | null {
  return sumNullable([row.likes, row.comments, row.shares, row.saves]);
}

function buildSummary(rows: ContentAnalyticsRow[]): CampaignPerformanceSummary {
  const impressions = sumNullable(rows.map((row) => row.impressions));
  const reach = sumNullable(rows.map((row) => row.reach));
  const engagement = sumNullable(rows.map(rowEngagement));

  return {
    impressions,
    reach,
    engagement,
    engagementRate: engagementRate(engagement, reach),
  };
}

export function calculateCampaignPerformance(input: {
  contentIds: string[];
  contentMeta: ContentMeta[];
  analyticsRows: ContentAnalyticsRow[];
}): CampaignPerformance {
  const { contentIds, contentMeta, analyticsRows } = input;

  if (contentIds.length === 0 || analyticsRows.length === 0) {
    return {
      summary: {
        impressions: null,
        reach: null,
        engagement: null,
        engagementRate: null,
      },
      trend: [],
      contentBreakdown: [],
      platformBreakdown: [],
      hasData: false,
    };
  }

  const summary = buildSummary(analyticsRows);

  const byDate = new Map<
    string,
    { impressions: number | null; reach: number | null; engagement: number | null }
  >();

  for (const row of analyticsRows) {
    const existing = byDate.get(row.metric_date) ?? {
      impressions: null,
      reach: null,
      engagement: null,
    };

    if (row.impressions != null) {
      existing.impressions = (existing.impressions ?? 0) + row.impressions;
    }
    if (row.reach != null) {
      existing.reach = (existing.reach ?? 0) + row.reach;
    }
    const engagement = rowEngagement(row);
    if (engagement != null) {
      existing.engagement = (existing.engagement ?? 0) + engagement;
    }

    byDate.set(row.metric_date, existing);
  }

  const trend = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, ...values }));

  const byContent = new Map<string, ContentAnalyticsRow[]>();
  for (const row of analyticsRows) {
    if (!row.content_id) continue;
    const list = byContent.get(row.content_id) ?? [];
    list.push(row);
    byContent.set(row.content_id, list);
  }

  const contentBreakdown = contentMeta.map((content) => {
    const rows = byContent.get(content.id) ?? [];
    const reach = sumNullable(rows.map((row) => row.reach));
    const engagement = sumNullable(rows.map(rowEngagement));
    return {
      contentId: content.id,
      headline: content.headline,
      impressions: sumNullable(rows.map((row) => row.impressions)),
      reach,
      engagement,
      engagementRate: engagementRate(engagement, reach),
    };
  });

  const byPlatform = new Map<string, ContentAnalyticsRow[]>();
  for (const row of analyticsRows) {
    const list = byPlatform.get(row.platform) ?? [];
    list.push(row);
    byPlatform.set(row.platform, list);
  }

  const platformBreakdown = Array.from(byPlatform.entries()).map(
    ([platform, rows]) => {
      const reach = sumNullable(rows.map((row) => row.reach));
      const engagement = sumNullable(rows.map(rowEngagement));
      return {
        platform,
        impressions: sumNullable(rows.map((row) => row.impressions)),
        reach,
        engagement,
      };
    }
  );

  const hasData =
    summary.impressions != null ||
    summary.reach != null ||
    summary.engagement != null;

  return {
    summary,
    trend,
    contentBreakdown,
    platformBreakdown,
    hasData,
  };
}
