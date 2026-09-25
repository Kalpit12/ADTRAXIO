import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildContentPerformance,
  buildOverview,
  sumDailyMetric,
  type DailyRow,
} from "@/lib/analytics/aggregate";
import { previousRange } from "@/lib/analytics/date-range";
import { listRecommendations } from "@/lib/intelligence/recommendations";
import type { WorkspaceScope } from "@/lib/workspaces/scope";
import { LEGACY_WORKSPACE_SCOPE } from "@/lib/workspaces/scope";
import { calculateCampaignPerformance } from "@/lib/campaigns/performance";
import { SNAPSHOT_DATA_VERSION } from "./constants";
import { ReportingError } from "./errors";
import {
  countCampaignsByStatus,
  countPublishedPostsInRange,
} from "./queries";
import type {
  ReportCampaignItem,
  ReportContentItem,
  ReportGrowthMetric,
  ReportOverviewMetrics,
  ReportPlatformMetrics,
  ReportRecommendationItem,
  ReportRecord,
  ReportSnapshotData,
  ReportingContext,
} from "./types";

const EMPTY_CLIENT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

function scopeAnalyticsQuery<T extends { is: (c: string, v: null) => T; eq: (c: string, v: string) => T }>(
  query: T,
  scope: WorkspaceScope
): T {
  if (!scope.isAgency) return query.is("client_workspace_id", null);
  if (scope.clientWorkspaceId) {
    return query.eq("client_workspace_id", scope.clientWorkspaceId);
  }
  return query.eq("client_workspace_id", EMPTY_CLIENT_WORKSPACE_ID);
}

function scopeWorkspaceQuery<T extends { is: (c: string, v: null) => T; eq: (c: string, v: string) => T }>(
  query: T,
  scope: WorkspaceScope
): T {
  if (!scope.isAgency) return query.is("client_workspace_id", null);
  if (scope.clientWorkspaceId) {
    return query.eq("client_workspace_id", scope.clientWorkspaceId);
  }
  return query.eq("client_workspace_id", EMPTY_CLIENT_WORKSPACE_ID);
}

function percentChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function engagementRate(
  engagement: number | null,
  reach: number | null,
  impressions: number | null
): number | null {
  const base = reach ?? impressions;
  if (engagement == null || base == null || base === 0) return null;
  return Number(((engagement / base) * 100).toFixed(2));
}

function buildGrowthMetrics(
  currentRows: DailyRow[],
  previousRows: DailyRow[]
): ReportGrowthMetric[] {
  const metrics: Array<{
    key: string;
    label: string;
    field: "impressions" | "reach" | "engagement";
  }> = [
    { key: "impressions", label: "Impressions", field: "impressions" },
    { key: "reach", label: "Reach", field: "reach" },
    { key: "engagement", label: "Engagement", field: "engagement" },
  ];

  return metrics.map(({ key, label, field }) => {
    const current = sumDailyMetric(currentRows, field);
    const previous = sumDailyMetric(previousRows, field);
    return {
      key,
      label,
      current,
      previous,
      changePercent: percentChange(current, previous),
    };
  });
}

function filterPlatforms<T extends { platform?: string }>(
  rows: T[],
  platforms: string[]
): T[] {
  if (platforms.length === 0) return rows;
  return rows.filter((row) => platforms.includes(row.platform ?? ""));
}

async function loadDailyRows(
  supabase: SupabaseClient,
  organizationId: string,
  scope: WorkspaceScope,
  from: string,
  to: string,
  platforms: string[]
): Promise<DailyRow[]> {
  let query = supabase
    .from("analytics_daily")
    .select("metric_date, platform, impressions, reach, engagement, followers")
    .eq("organization_id", organizationId)
    .gte("metric_date", from)
    .lte("metric_date", to)
    .order("metric_date", { ascending: true });

  query = scopeAnalyticsQuery(query, scope);

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return [];
    throw new ReportingError("database_error", error.message, 500);
  }

  return filterPlatforms((data ?? []) as DailyRow[], platforms);
}

async function loadContentRows(
  supabase: SupabaseClient,
  organizationId: string,
  scope: WorkspaceScope,
  from: string,
  to: string,
  platforms: string[]
) {
  let query = supabase
    .from("content_analytics")
    .select(
      `id, scheduled_post_id, platform_post_id, platform, metric_date,
       impressions, reach, likes, comments, shares, saves, engagement_rate,
       scheduled_posts(caption, published_at, social_accounts(account_name))`
    )
    .eq("organization_id", organizationId)
    .gte("metric_date", from)
    .lte("metric_date", to);

  query = scopeAnalyticsQuery(query, scope);

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return [];
    throw new ReportingError("database_error", error.message, 500);
  }

  return filterPlatforms(data ?? [], platforms);
}

async function loadCampaigns(
  supabase: SupabaseClient,
  organizationId: string,
  scope: WorkspaceScope
) {
  let query = supabase
    .from("campaigns")
    .select("id, name, objective, status, start_date, end_date")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  query = scopeWorkspaceQuery(query, scope);

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return [];
    throw new ReportingError("database_error", error.message, 500);
  }

  return data ?? [];
}

async function loadCampaignPerformance(
  supabase: SupabaseClient,
  organizationId: string,
  campaignId: string
) {
  const { data: contentLinks } = await supabase
    .from("campaign_content")
    .select("content_id, content(id, headline)")
    .eq("campaign_id", campaignId);

  const contentIds = (contentLinks ?? []).map((link) => link.content_id as string);
  const contentMeta = (contentLinks ?? []).map((link) => {
    const content = link.content as { id?: string; headline?: string | null } | null;
    return {
      id: (content?.id ?? link.content_id) as string,
      headline: content?.headline ?? null,
    };
  });

  if (contentIds.length === 0) {
    return calculateCampaignPerformance({
      contentIds: [],
      contentMeta: [],
      analyticsRows: [],
    });
  }

  const { data: posts } = await supabase
    .from("scheduled_posts")
    .select("id, content_id, platform_post_id")
    .in("content_id", contentIds)
    .eq("status", "published")
    .not("platform_post_id", "is", null);

  const postIds = (posts ?? []).map((post) => post.id as string);
  const contentByPost = new Map<string, string>();
  for (const post of posts ?? []) {
    if (post.content_id) {
      contentByPost.set(post.id as string, post.content_id as string);
    }
  }

  if (postIds.length === 0) {
    return calculateCampaignPerformance({
      contentIds,
      contentMeta,
      analyticsRows: [],
    });
  }

  const { data: analytics } = await supabase
    .from("content_analytics")
    .select(
      "scheduled_post_id, platform, metric_date, impressions, reach, likes, comments, shares, saves, engagement_rate"
    )
    .eq("organization_id", organizationId)
    .in("scheduled_post_id", postIds);

  const analyticsRows = (analytics ?? []).map((row) => ({
    content_id: row.scheduled_post_id
      ? contentByPost.get(row.scheduled_post_id as string) ?? null
      : null,
    scheduled_post_id: row.scheduled_post_id as string | null,
    platform: row.platform as string,
    metric_date: row.metric_date as string,
    impressions: row.impressions as number | null,
    reach: row.reach as number | null,
    likes: row.likes as number | null,
    comments: row.comments as number | null,
    shares: row.shares as number | null,
    saves: row.saves as number | null,
    engagement_rate: row.engagement_rate as number | null,
  }));

  return calculateCampaignPerformance({
    contentIds,
    contentMeta,
    analyticsRows,
  });
}

async function loadRecommendations(
  supabase: SupabaseClient,
  organizationId: string,
  scope: WorkspaceScope,
  from: string,
  to: string
): Promise<ReportRecommendationItem[]> {
  try {
    const records = await listRecommendations(supabase, organizationId, scope, {
      limit: 8,
    });

    return records
      .filter(
        (rec) =>
          rec.periodStart <= to &&
          rec.periodEnd >= from &&
          rec.recordKind === "recommendation"
      )
      .slice(0, 5)
      .map((rec) => ({
        id: rec.id,
        title: rec.title,
        observation: rec.observation,
        recommendation: rec.recommendation,
        type: rec.type,
        priority: rec.priority,
      }));
  } catch {
    return [];
  }
}

export async function buildReportSnapshotData(
  supabase: SupabaseClient,
  report: ReportRecord,
  ctx: ReportingContext,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<Omit<ReportSnapshotData, "aiSummary">> {
  const range = { from: report.dateFrom, to: report.dateTo };
  const prev = previousRange(range);
  const platforms = report.platforms;

  const [currentRows, previousRows, contentRaw, campaignsRaw, publishedContent, activeCampaigns, completedCampaigns, recommendations] =
    await Promise.all([
      loadDailyRows(supabase, ctx.organizationId, scope, range.from, range.to, platforms),
      loadDailyRows(supabase, ctx.organizationId, scope, prev.from, prev.to, platforms),
      report.includeContent
        ? loadContentRows(supabase, ctx.organizationId, scope, range.from, range.to, platforms)
        : Promise.resolve([]),
      report.includeCampaigns
        ? loadCampaigns(supabase, ctx.organizationId, scope)
        : Promise.resolve([]),
      countPublishedPostsInRange(supabase, ctx.organizationId, scope, range.from, range.to),
      countCampaignsByStatus(supabase, ctx.organizationId, scope, "active"),
      countCampaignsByStatus(supabase, ctx.organizationId, scope, "completed"),
      loadRecommendations(supabase, ctx.organizationId, scope, range.from, range.to),
    ]);

  const overviewBuilt = buildOverview(currentRows, range);
  const engagement = overviewBuilt.summary.engagement;
  const reach = overviewBuilt.summary.reach;
  const impressions = overviewBuilt.summary.impressions;

  const overview: ReportOverviewMetrics = {
    impressions,
    reach,
    engagement,
    engagementRate: engagementRate(engagement, reach, impressions),
    followers: overviewBuilt.summary.followers,
    publishedContent,
    activeCampaigns,
    completedCampaigns,
    hasData: overviewBuilt.summary.hasData,
  };

  const growth = buildGrowthMetrics(currentRows, previousRows);

  let platformMetrics: ReportPlatformMetrics[] = [];
  if (report.includePlatforms) {
    platformMetrics = overviewBuilt.platforms.map((p) => ({
      platform: p.platform,
      impressions: p.impressions,
      reach: p.reach,
      engagement: p.engagement,
      followers: null,
      hasData: p.hasData,
    }));

    for (const item of platformMetrics) {
      const platformRows = currentRows.filter((r) => r.platform === item.platform);
      const followers = platformRows
        .filter((r) => r.followers != null)
        .sort((a, b) => b.metric_date.localeCompare(a.metric_date))[0]?.followers;
      item.followers = followers ?? null;
    }
  }

  let contentItems: ReportContentItem[] = [];
  if (report.includeContent) {
    const performance = buildContentPerformance(
      contentRaw as unknown as Parameters<typeof buildContentPerformance>[0]
    );
    contentItems = performance
      .sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0))
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        platform: item.platform,
        caption: item.caption,
        publishedAt: item.publishedAt,
        accountName: item.accountName,
        impressions: item.impressions,
        reach: item.reach,
        engagement: item.engagement,
        engagementRate: item.engagementRate,
      }));
  }

  let campaignItems: ReportCampaignItem[] = [];
  if (report.includeCampaigns) {
    campaignItems = await Promise.all(
      campaignsRaw.map(async (campaign) => {
        const { data: contentLinks } = await supabase
          .from("campaign_content")
          .select("content_id")
          .eq("campaign_id", campaign.id as string);

        let performance = {
          impressions: null as number | null,
          reach: null as number | null,
          engagement: null as number | null,
        };

        try {
          const perf = await loadCampaignPerformance(
            supabase,
            ctx.organizationId,
            campaign.id as string
          );
          performance = {
            impressions: perf.summary.impressions,
            reach: perf.summary.reach,
            engagement: perf.summary.engagement,
          };
        } catch {
          /* unavailable metrics remain null */
        }

        return {
          id: campaign.id as string,
          name: campaign.name as string,
          objective: (campaign.objective as string | null) ?? null,
          status: campaign.status as string,
          contentCount: contentLinks?.length ?? 0,
          impressions: performance.impressions,
          reach: performance.reach,
          engagement: performance.engagement,
          startDate: (campaign.start_date as string | null) ?? null,
          endDate: (campaign.end_date as string | null) ?? null,
        };
      })
    );
  }

  const generatedAt = new Date().toISOString();

  return {
    version: SNAPSHOT_DATA_VERSION,
    generatedAt,
    period: range,
    client: { id: ctx.clientWorkspaceId, name: ctx.clientWorkspaceName },
    report: {
      id: report.id,
      name: report.name,
      description: report.description,
    },
    config: {
      platforms: report.platforms,
      includeCampaigns: report.includeCampaigns,
      includeContent: report.includeContent,
      includePlatforms: report.includePlatforms,
      includeAiSummary: report.includeAiSummary,
    },
    overview,
    growth,
    platforms: platformMetrics,
    content: contentItems,
    campaigns: campaignItems,
    recommendations,
  };
}
