import { sumDailyMetric, type DailyRow } from "@/lib/analytics/aggregate";
import { parseDateRange, previousRange } from "@/lib/analytics/date-range";
import {
  MAX_CAMPAIGNS,
  MAX_TOP_CONTENT,
  MAX_UNDERPERFORMING,
  MEANINGFUL_CHANGE_THRESHOLD_PERCENT,
  SAMPLE_SIZE_INSUFFICIENT,
  SAMPLE_SIZE_LOW,
  SAMPLE_SIZE_RELIABLE,
} from "./constants";
import type {
  CampaignAnalysisItem,
  ConfidenceLevel,
  ContentAnalysisItem,
  ContentPatternItem,
  DataAvailability,
  IntelligenceAnalysisContext,
  MetricChange,
  PeriodMetrics,
  PlatformComparisonItem,
  PublishingPatternSummary,
  TimingPatternItem,
} from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyClientWorkspaceScope,
  type FilterableQuery,
} from "@/lib/workspaces/query-scope";
import type { WorkspaceScope } from "@/lib/workspaces/scope";
import { LEGACY_WORKSPACE_SCOPE } from "@/lib/workspaces/scope";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function percentChange(
  current: number | null,
  previous: number | null
): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function sampleConfidence(count: number): ConfidenceLevel | "insufficient" {
  if (count < SAMPLE_SIZE_INSUFFICIENT) return "insufficient";
  if (count <= SAMPLE_SIZE_LOW) return "low";
  if (count >= SAMPLE_SIZE_RELIABLE) return "high";
  return "medium";
}

function buildPeriodMetrics(rows: DailyRow[]): PeriodMetrics {
  return {
    impressions: sumDailyMetric(rows, "impressions"),
    reach: sumDailyMetric(rows, "reach"),
    engagement: sumDailyMetric(rows, "engagement"),
  };
}

function buildChanges(
  current: PeriodMetrics,
  previous: PeriodMetrics
): MetricChange[] {
  const metrics: Array<keyof PeriodMetrics> = [
    "impressions",
    "reach",
    "engagement",
  ];

  return metrics.map((metric) => {
    const cur = current[metric];
    const prev = previous[metric];
    const change = percentChange(cur, prev);
    const meaningful =
      change != null && Math.abs(change) >= MEANINGFUL_CHANGE_THRESHOLD_PERCENT;

    let direction: MetricChange["direction"] = "unknown";
    if (change == null) direction = "unknown";
    else if (change > 0) direction = "up";
    else if (change < 0) direction = "down";
    else direction = "flat";

    return {
      metric,
      current: cur,
      previous: prev,
      changePercent: change,
      meaningful,
      direction,
    };
  });
}

function rowEngagement(row: {
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
}): number | null {
  const parts = [row.likes, row.comments, row.shares, row.saves];
  const present = parts.filter((v): v is number => v != null);
  if (present.length === 0) return null;
  return present.reduce((acc, v) => acc + v, 0);
}

type ContentMetricRow = {
  content_id: string | null;
  platform: string;
  impressions: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  scheduled_posts?: {
    published_at: string | null;
    content?: {
      id: string;
      headline: string | null;
      platform: string;
      content_type: string | null;
      tone: string | null;
      goal: string | null;
    } | null;
  } | null;
};

function aggregateContentItems(rows: ContentMetricRow[]): ContentAnalysisItem[] {
  const byContent = new Map<string, ContentAnalysisItem & { engagementParts: number[] }>();

  for (const row of rows) {
    const content = row.scheduled_posts?.content;
    const contentId = content?.id ?? row.content_id;
    if (!contentId) continue;

    const engagement = rowEngagement(row);
    const existing = byContent.get(contentId) ?? {
      contentId,
      headline: content?.headline ?? null,
      platform: content?.platform ?? row.platform,
      contentType: content?.content_type ?? null,
      tone: content?.tone ?? null,
      goal: content?.goal ?? null,
      engagement: null,
      reach: null,
      impressions: null,
      publishedAt: row.scheduled_posts?.published_at ?? null,
      engagementParts: [],
    };

    if (engagement != null) existing.engagementParts.push(engagement);
    if (row.reach != null) {
      existing.reach = (existing.reach ?? 0) + row.reach;
    }
    if (row.impressions != null) {
      existing.impressions = (existing.impressions ?? 0) + row.impressions;
    }

    byContent.set(contentId, existing);
  }

  return Array.from(byContent.values())
    .map(({ engagementParts, ...item }) => ({
      ...item,
      engagement:
        engagementParts.length > 0
          ? engagementParts.reduce((a, b) => a + b, 0)
          : null,
    }))
    .sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0));
}

function buildContentPatterns(items: ContentAnalysisItem[]): ContentPatternItem[] {
  const dimensions: Array<{
    dimension: ContentPatternItem["dimension"];
    pick: (item: ContentAnalysisItem) => string | null;
  }> = [
    { dimension: "content_type", pick: (item) => item.contentType },
    { dimension: "tone", pick: (item) => item.tone },
    { dimension: "goal", pick: (item) => item.goal },
  ];

  const patterns: ContentPatternItem[] = [];

  for (const { dimension, pick } of dimensions) {
    const groups = new Map<string, number[]>();

    for (const item of items) {
      const label = pick(item);
      if (!label || item.engagement == null) continue;
      const list = groups.get(label) ?? [];
      list.push(item.engagement);
      groups.set(label, list);
    }

    for (const [label, engagements] of groups.entries()) {
      const avg =
        engagements.length > 0
          ? Number(
              (
                engagements.reduce((a, b) => a + b, 0) / engagements.length
              ).toFixed(1)
            )
          : null;

      patterns.push({
        label,
        dimension,
        count: engagements.length,
        avgEngagement: avg,
        sampleConfidence: sampleConfidence(engagements.length),
      });
    }
  }

  return patterns
    .filter((p) => p.sampleConfidence !== "insufficient")
    .sort((a, b) => (b.avgEngagement ?? 0) - (a.avgEngagement ?? 0))
    .slice(0, 6);
}

function buildPlatformComparison(
  currentRows: ContentMetricRow[],
  previousRows: ContentMetricRow[]
): PlatformComparisonItem[] {
  const platforms = new Set<string>();
  for (const row of [...currentRows, ...previousRows]) {
    platforms.add(row.platform);
  }

  return Array.from(platforms).map((platform) => {
    const currentEngagements = currentRows
      .filter((r) => r.platform === platform)
      .map(rowEngagement)
      .filter((v): v is number => v != null);
    const previousEngagements = previousRows
      .filter((r) => r.platform === platform)
      .map(rowEngagement)
      .filter((v): v is number => v != null);

    const currentEngagement =
      currentEngagements.length > 0
        ? currentEngagements.reduce((a, b) => a + b, 0)
        : null;
    const previousEngagement =
      previousEngagements.length > 0
        ? previousEngagements.reduce((a, b) => a + b, 0)
        : null;

    return {
      platform,
      currentEngagement,
      previousEngagement,
      changePercent: percentChange(currentEngagement, previousEngagement),
      contentCount: new Set(
        currentRows
          .filter((r) => r.platform === platform)
          .map((r) => r.content_id)
          .filter(Boolean)
      ).size,
    };
  });
}

function buildPublishingPatterns(
  posts: Array<{ status: string; published_at: string | null; scheduled_for: string | null }>,
  period: { from: string; to: string }
): PublishingPatternSummary {
  const from = new Date(`${period.from}T00:00:00.000Z`);
  const to = new Date(`${period.to}T00:00:00.000Z`);
  const totalDays =
    Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  const publishedInPeriod = posts.filter((p) => p.status === "published").length;
  const scheduledInPeriod = posts.filter((p) => p.status === "scheduled").length;

  const publishDays = new Set<string>();
  for (const post of posts) {
    if (post.status !== "published" || !post.published_at) continue;
    publishDays.add(post.published_at.slice(0, 10));
  }

  const weeks = Math.max(totalDays / 7, 1);

  return {
    publishedInPeriod,
    scheduledInPeriod,
    postsPerWeek: publishedInPeriod > 0 ? Number((publishedInPeriod / weeks).toFixed(1)) : null,
    daysWithPosts: publishDays.size,
    totalDays,
  };
}

function buildTimingPatterns(
  rows: ContentMetricRow[]
): { sufficient: boolean; items: TimingPatternItem[] } {
  const byDay = new Map<number, number[]>();

  for (const row of rows) {
    const publishedAt = row.scheduled_posts?.published_at;
    const engagement = rowEngagement(row);
    if (!publishedAt || engagement == null) continue;

    const day = new Date(publishedAt).getUTCDay();
    const list = byDay.get(day) ?? [];
    list.push(engagement);
    byDay.set(day, list);
  }

  const totalSamples = Array.from(byDay.values()).reduce(
    (acc, list) => acc + list.length,
    0
  );

  const items = DAY_NAMES.map((dayOfWeek, index) => {
    const engagements = byDay.get(index) ?? [];
    const avgEngagement =
      engagements.length > 0
        ? Number(
            (
              engagements.reduce((a, b) => a + b, 0) / engagements.length
            ).toFixed(1)
          )
        : null;

    return {
      dayOfWeek,
      postCount: engagements.length,
      avgEngagement,
    };
  }).filter((item) => item.postCount > 0);

  return {
    sufficient: totalSamples >= SAMPLE_SIZE_RELIABLE,
    items,
  };
}

export async function buildIntelligenceAnalysis(
  supabase: SupabaseClient,
  organizationId: string,
  options?: {
    campaignId?: string | null;
    preset?: "7d" | "30d" | "90d";
    scope?: WorkspaceScope;
  }
): Promise<IntelligenceAnalysisContext> {
  const period = parseDateRange({ preset: options?.preset ?? "30d" });
  const previousPeriod = previousRange(period);
  const campaignId = options?.campaignId ?? null;
  const scope = options?.scope ?? LEGACY_WORKSPACE_SCOPE;

  type ScopedResult<T> = Promise<{ data: T }>;
  const scopeQuery = <T>(builder: unknown): ScopedResult<T> =>
    applyClientWorkspaceScope(
      builder as FilterableQuery,
      scope
    ) as unknown as ScopedResult<T>;

  const [
    { data: connectedAccounts },
    { data: dailyAnalytics },
    { data: prevDailyAnalytics },
    { data: campaigns },
  ] = await Promise.all([
    scopeQuery<Array<{ id: string; platform: string }>>(
      supabase
        .from("social_accounts")
        .select("id, platform")
        .eq("organization_id", organizationId)
        .eq("status", "connected")
        .in("platform", ["facebook", "instagram"])
    ),
    scopeQuery<DailyRow[]>(
      supabase
        .from("analytics_daily")
        .select("metric_date, platform, impressions, reach, engagement")
        .eq("organization_id", organizationId)
        .gte("metric_date", period.from)
        .lte("metric_date", period.to)
    ),
    scopeQuery<DailyRow[]>(
      supabase
        .from("analytics_daily")
        .select("metric_date, platform, impressions, reach, engagement")
        .eq("organization_id", organizationId)
        .gte("metric_date", previousPeriod.from)
        .lte("metric_date", previousPeriod.to)
    ),
    scopeQuery<Array<{ id: string; name: string; status: string; objective: string }>>(
      supabase
        .from("campaigns")
        .select("id, name, status, objective")
        .eq("organization_id", organizationId)
        .neq("status", "archived")
        .limit(MAX_CAMPAIGNS)
    ),
  ]);

  let campaignContentIds: string[] | null = null;
  let campaignName: string | null = null;

  if (campaignId) {
    const scopedWorkspaceId = scope.isAgency
      ? scope.clientWorkspaceId ?? "00000000-0000-0000-0000-000000000000"
      : null;
    let campaignLookup = supabase
      .from("campaigns")
      .select("id, name")
      .eq("id", campaignId)
      .eq("organization_id", organizationId);
    campaignLookup = scopedWorkspaceId === null
      ? campaignLookup.is("client_workspace_id", null)
      : campaignLookup.eq("client_workspace_id", scopedWorkspaceId);
    const { data: campaignRow } = await campaignLookup.maybeSingle();

    if (!campaignRow) {
      throw new Error("Campaign not found.");
    }

    campaignName = campaignRow.name as string;

    const { data: links } = await supabase
      .from("campaign_content")
      .select("content_id")
      .eq("campaign_id", campaignId);

    campaignContentIds = (links ?? []).map((l) => l.content_id as string);
  }

  const currentDaily = (dailyAnalytics ?? []) as DailyRow[];
  const previousDaily = (prevDailyAnalytics ?? []) as DailyRow[];

  const [{ data: contentAnalytics }, { data: prevContentAnalytics }] =
    await Promise.all([
      scopeQuery<unknown[]>(
        supabase
          .from("content_analytics")
          .select(
            `platform, impressions, reach, likes, comments, shares, saves, metric_date,
       scheduled_post_id,
       scheduled_posts!inner (
         published_at, content_id,
         content ( id, headline, platform, content_type, tone, goal )
       )`
          )
          .eq("organization_id", organizationId)
          .gte("metric_date", period.from)
          .lte("metric_date", period.to)
      ),
      scopeQuery<unknown[]>(
        supabase
          .from("content_analytics")
          .select(
            `platform, impressions, reach, likes, comments, shares, saves,
       scheduled_posts!inner ( content_id, content ( id ) )`
          )
          .eq("organization_id", organizationId)
          .gte("metric_date", previousPeriod.from)
          .lte("metric_date", previousPeriod.to)
      ),
    ]);

  const mapContentRows = (rows: unknown[]): ContentMetricRow[] =>
    (rows ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      const scheduledPosts = r.scheduled_posts;
      const post = Array.isArray(scheduledPosts)
        ? scheduledPosts[0]
        : scheduledPosts;
      const postObj = post as Record<string, unknown> | null;
      const contentRaw = postObj?.content;
      const content = Array.isArray(contentRaw) ? contentRaw[0] : contentRaw;

      return {
        content_id: (postObj?.content_id as string) ?? null,
        platform: r.platform as string,
        impressions: r.impressions as number | null,
        reach: r.reach as number | null,
        likes: r.likes as number | null,
        comments: r.comments as number | null,
        shares: r.shares as number | null,
        saves: r.saves as number | null,
        scheduled_posts: postObj
          ? {
              published_at: postObj.published_at as string | null,
              content: content as ContentMetricRow["scheduled_posts"] extends infer T
                ? T extends { content?: infer C }
                  ? C
                  : null
                : null,
            }
          : null,
      };
    });

  let currentContentRows = mapContentRows(contentAnalytics ?? []);
  let previousContentRows = mapContentRows(prevContentAnalytics ?? []);

  if (campaignContentIds) {
    const idSet = new Set(campaignContentIds);
    currentContentRows = currentContentRows.filter(
      (row) => row.content_id && idSet.has(row.content_id)
    );
    previousContentRows = previousContentRows.filter(
      (row) => row.content_id && idSet.has(row.content_id)
    );
  }

  const contentItems = aggregateContentItems(currentContentRows);
  const topContent = contentItems.slice(0, MAX_TOP_CONTENT);
  const underperformingContent = [...contentItems]
    .reverse()
    .slice(0, MAX_UNDERPERFORMING);

  const platforms = Array.from(
    new Set([
      ...(connectedAccounts ?? []).map((a) => a.platform as string),
      ...currentContentRows.map((r) => r.platform),
    ])
  );

  const postsWorkspaceId = scope.isAgency
    ? scope.clientWorkspaceId ?? "00000000-0000-0000-0000-000000000000"
    : null;
  let postsQuery = supabase
    .from("scheduled_posts")
    .select("status, published_at, scheduled_for, content_id")
    .eq("organization_id", organizationId);
  postsQuery =
    postsWorkspaceId === null
      ? postsQuery.is("client_workspace_id", null)
      : postsQuery.eq("client_workspace_id", postsWorkspaceId);

  if (campaignContentIds) {
    if (campaignContentIds.length === 0) {
      postsQuery = postsQuery.in("content_id", ["00000000-0000-0000-0000-000000000000"]);
    } else {
      postsQuery = postsQuery.in("content_id", campaignContentIds);
    }
  }

  const { data: scheduledPosts } = await postsQuery;

  const filteredPosts = (scheduledPosts ?? []).filter((post: {
    published_at?: string | null;
    scheduled_for?: string | null;
    status?: string;
  }) => {
    const date = (post.published_at ?? post.scheduled_for) as string | null;
    if (!date) return post.status === "scheduled";
    const day = date.slice(0, 10);
    return day >= period.from && day <= period.to;
  });

  const campaignSummaries: CampaignAnalysisItem[] = [];

  if (!campaignId && (campaigns ?? []).length > 0) {
    for (const campaign of campaigns ?? []) {
      const { data: links } = await supabase
        .from("campaign_content")
        .select("content_id")
        .eq("campaign_id", campaign.id);

      const ids = (links ?? []).map((l) => l.content_id as string);
      const campaignRows = currentContentRows.filter(
        (row) => row.content_id && ids.includes(row.content_id)
      );
      const engagements = campaignRows
        .map(rowEngagement)
        .filter((v): v is number => v != null);

      campaignSummaries.push({
        campaignId: campaign.id as string,
        name: campaign.name as string,
        status: campaign.status as string,
        objective: (campaign.objective as string | null) ?? null,
        contentCount: ids.length,
        engagement:
          engagements.length > 0
            ? engagements.reduce((a, b) => a + b, 0)
            : null,
        reach: campaignRows
          .map((r) => r.reach)
          .filter((v): v is number => v != null)
          .reduce((a, b) => a + b, 0) || null,
      });
    }
  }

  const currentMetrics = buildPeriodMetrics(currentDaily);
  const previousMetrics = buildPeriodMetrics(previousDaily);

  const analyticsRowCount = currentDaily.length + currentContentRows.length;
  const contentWithMetricsCount = contentItems.length;

  const dataAvailability: DataAvailability = {
    connectedAccounts: connectedAccounts?.length ?? 0,
    hasAnalytics:
      currentMetrics.impressions != null ||
      currentMetrics.reach != null ||
      currentMetrics.engagement != null ||
      contentWithMetricsCount > 0,
    hasPublishedContent: contentWithMetricsCount > 0,
    hasCampaigns: (campaigns ?? []).length > 0,
    analyticsRowCount,
    contentWithMetricsCount,
    sufficientForInsights:
      contentWithMetricsCount >= 1 || analyticsRowCount >= 3,
    sufficientForRecommendations:
      contentWithMetricsCount >= SAMPLE_SIZE_INSUFFICIENT ||
      analyticsRowCount >= 7,
  };

  return {
    scope: campaignId ? "campaign" : "organization",
    campaignId,
    campaignName,
    period,
    previousPeriod,
    platforms,
    dataAvailability,
    summary: {
      current: currentMetrics,
      previous: previousMetrics,
    },
    changes: buildChanges(currentMetrics, previousMetrics),
    topContent,
    underperformingContent,
    platformComparison: buildPlatformComparison(
      currentContentRows,
      previousContentRows
    ),
    campaigns: campaignSummaries,
    contentPatterns: buildContentPatterns(contentItems),
    publishingPatterns: buildPublishingPatterns(
      filteredPosts as Array<{
        status: string;
        published_at: string | null;
        scheduled_for: string | null;
      }>,
      period
    ),
    timingPatterns: buildTimingPatterns(currentContentRows),
  };
}
