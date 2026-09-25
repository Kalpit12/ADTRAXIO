import type {
  AnalyticsOverview,
  AnalyticsPlatform,
  ContentPerformanceRow,
} from "./types";

export type DailyRow = {
  metric_date: string;
  platform?: string;
  impressions: number | null;
  reach: number | null;
  engagement: number | null;
  followers?: number | null;
  clicks?: number | null;
};

type ContentRow = {
  id: string;
  scheduled_post_id: string | null;
  platform_post_id: string;
  platform: string;
  metric_date: string;
  impressions: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  engagement_rate: number | null;
  scheduled_posts?: {
    caption: string | null;
    published_at: string | null;
    social_accounts?: { account_name: string | null } | null;
  } | null;
};

function sumField(rows: DailyRow[], field: keyof DailyRow): number | null {
  const values = rows
    .map((row) => row[field])
    .filter((value): value is number => typeof value === "number");

  if (values.length === 0) return null;
  return values.reduce((acc, value) => acc + value, 0);
}

function latestFollowers(rows: DailyRow[]): number | null {
  const sorted = [...rows]
    .filter((row) => row.followers != null)
    .sort((a, b) => b.metric_date.localeCompare(a.metric_date));

  return sorted[0]?.followers ?? null;
}

export function buildOverview(
  rows: DailyRow[],
  range: { from: string; to: string }
): AnalyticsOverview {
  const filtered = rows.filter(
    (row) => row.metric_date >= range.from && row.metric_date <= range.to
  );

  const byDate = new Map<
    string,
    { impressions: number; reach: number; engagement: number; hasValue: boolean }
  >();

  for (const row of filtered) {
    const existing = byDate.get(row.metric_date) ?? {
      impressions: 0,
      reach: 0,
      engagement: 0,
      hasValue: false,
    };

    if (row.impressions != null) {
      existing.impressions += row.impressions;
      existing.hasValue = true;
    }
    if (row.reach != null) {
      existing.reach += row.reach;
      existing.hasValue = true;
    }
    if (row.engagement != null) {
      existing.engagement += row.engagement;
      existing.hasValue = true;
    }

    byDate.set(row.metric_date, existing);
  }

  const series = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({
      date,
      impressions: values.hasValue ? values.impressions : null,
      reach: values.hasValue ? values.reach : null,
      engagement: values.hasValue ? values.engagement : null,
    }));

  const platforms: AnalyticsPlatform[] = ["instagram", "facebook"];
  const platformBreakdown = platforms.map((platform) => {
    const platformRows = filtered.filter((row) => row.platform === platform);
    const impressions = sumField(platformRows, "impressions");
    const reach = sumField(platformRows, "reach");
    const engagement = sumField(platformRows, "engagement");
    const hasData =
      impressions != null || reach != null || engagement != null;

    return { platform, impressions, reach, engagement, hasData };
  });

  const impressions = sumField(filtered, "impressions");
  const reach = sumField(filtered, "reach");
  const engagement = sumField(filtered, "engagement");
  const followers = latestFollowers(filtered);
  const hasData =
    impressions != null || reach != null || engagement != null || followers != null;

  return {
    summary: { impressions, reach, engagement, followers, hasData },
    series,
    platforms: platformBreakdown.filter((item) => item.hasData),
  };
}

export function buildContentPerformance(rows: ContentRow[]): ContentPerformanceRow[] {
  const latestByPost = new Map<string, ContentRow>();

  for (const row of rows) {
    const existing = latestByPost.get(row.platform_post_id);
    if (!existing || row.metric_date > existing.metric_date) {
      latestByPost.set(row.platform_post_id, row);
    }
  }

  return Array.from(latestByPost.values())
    .map((row) => {
      const engagementParts = [row.likes, row.comments, row.shares, row.saves];
      const engagement =
        engagementParts.some((value) => value != null)
          ? engagementParts.reduce<number>((acc, value) => acc + (value ?? 0), 0)
          : null;

      return {
        id: row.id,
        scheduledPostId: row.scheduled_post_id,
        platformPostId: row.platform_post_id,
        platform: row.platform as AnalyticsPlatform,
        caption: row.scheduled_posts?.caption ?? null,
        publishedAt: row.scheduled_posts?.published_at ?? null,
        accountName: row.scheduled_posts?.social_accounts?.account_name ?? null,
        impressions: row.impressions,
        reach: row.reach,
        engagement,
        engagementRate: row.engagement_rate,
      };
    })
    .sort((a, b) => {
      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bTime - aTime;
    });
}

export function sumDailyMetric(
  rows: DailyRow[],
  field: "impressions" | "reach" | "engagement" | "clicks"
): number | null {
  return sumField(rows, field);
}
