import { sumDailyMetric, type DailyRow } from "@/lib/analytics/aggregate";
import { parseDateRange, previousRange } from "@/lib/analytics/date-range";
import {
  getAnalyticsOverview,
  getContentPerformance,
} from "@/lib/analytics/service";
import { getLatestGrowthBrief, toGrowthBriefSummary } from "@/lib/agent/brief";
import { getDashboardRecommendations } from "@/lib/intelligence/recommendations";
import { listPublishingPosts } from "@/lib/publishing/service";
import type { AssistantContext } from "./types";
import type { AssistantHomePayload } from "./home-types";

const EMPTY_CLIENT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

function scopeAnalyticsQuery<
  T extends { is: (c: string, v: null) => T; eq: (c: string, v: string) => T },
>(query: T, ctx: AssistantContext): T {
  if (!ctx.isAgency) return query.is("client_workspace_id", null);
  if (ctx.clientWorkspaceId) {
    return query.eq("client_workspace_id", ctx.clientWorkspaceId);
  }
  return query.eq("client_workspace_id", EMPTY_CLIENT_WORKSPACE_ID);
}

function percentChange(
  current: number | null,
  previous: number | null
): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function workspaceLabel(ctx: AssistantContext): string {
  if (ctx.clientName) return ctx.clientName;
  if (ctx.isAgency) return "Agency workspace";
  return "Workspace";
}

async function loadDailyRows(
  ctx: AssistantContext,
  from: string,
  to: string
): Promise<DailyRow[]> {
  let query = ctx.supabase
    .from("analytics_daily")
    .select(
      "metric_date, platform, impressions, reach, engagement, followers, clicks"
    )
    .eq("organization_id", ctx.organizationId)
    .gte("metric_date", from)
    .lte("metric_date", to);

  query = scopeAnalyticsQuery(query, ctx);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as DailyRow[];
}

export async function getAssistantHomeInsights(
  ctx: AssistantContext
): Promise<AssistantHomePayload> {
  const label = workspaceLabel(ctx);

  if (ctx.isAgency && !ctx.clientWorkspaceId) {
    return {
      workspaceLabel: label,
      needsClientSelection: true,
      hasInsights: false,
      periodLabel: "Last 30 days",
      performance: [],
      topContent: [],
      nextAction: null,
      publishing: null,
      growthBrief: null,
    };
  }

  const currentRange = parseDateRange({ preset: "30d" });
  const prevRange = previousRange(currentRange);

  const [
    currentRows,
    previousRows,
    overview,
    contentRows,
    recommendations,
    posts,
    latestBrief,
  ] = await Promise.all([
      loadDailyRows(ctx, currentRange.from, currentRange.to),
      loadDailyRows(ctx, prevRange.from, prevRange.to),
      getAnalyticsOverview(ctx.supabase, ctx.organizationId, {
        preset: "30d",
        scope: ctx.scope,
      }).catch(() => null),
      getContentPerformance(ctx.supabase, ctx.organizationId, {
        preset: "30d",
        scope: ctx.scope,
      }).catch(() => []),
      getDashboardRecommendations(
        ctx.supabase,
        ctx.organizationId,
        ctx.scope,
        1
      ).catch(() => []),
      listPublishingPosts(ctx.supabase, ctx.organizationId, ctx.scope).catch(
        () => []
      ),
      getLatestGrowthBrief(ctx, "weekly").catch(() => null),
    ]);

  const reach = sumDailyMetric(currentRows, "reach");
  const engagement = sumDailyMetric(currentRows, "engagement");
  const impressions = sumDailyMetric(currentRows, "impressions");

  const performance = [
    {
      key: "reach" as const,
      label: "Reach",
      value: reach,
      changePercent: percentChange(reach, sumDailyMetric(previousRows, "reach")),
      hasData: reach != null,
    },
    {
      key: "engagement" as const,
      label: "Engagement",
      value: engagement,
      changePercent: percentChange(
        engagement,
        sumDailyMetric(previousRows, "engagement")
      ),
      hasData: engagement != null,
    },
    {
      key: "impressions" as const,
      label: "Impressions",
      value: impressions,
      changePercent: percentChange(
        impressions,
        sumDailyMetric(previousRows, "impressions")
      ),
      hasData: impressions != null,
    },
  ].filter((m) => m.hasData);

  const sortedContent = [...contentRows].sort(
    (a, b) => (b.engagement ?? 0) - (a.engagement ?? 0)
  );

  const topContent = sortedContent.slice(0, 3).map((row) => ({
    id: row.id,
    platform: row.platform,
    caption: row.caption,
    engagement: row.engagement,
    accountName: row.accountName,
  }));

  const topRec = recommendations[0];
  const nextAction = topRec
    ? {
        id: topRec.id,
        title: topRec.title,
        observation: topRec.observation,
        recommendation: topRec.recommendation,
      }
    : null;

  const scheduledCount = posts.filter(
    (p) => p.status === "scheduled" || p.status === "draft"
  ).length;
  const needsAttentionCount = posts.filter((p) => p.status === "failed").length;

  const publishing =
    scheduledCount > 0 || needsAttentionCount > 0
      ? { scheduledCount, needsAttentionCount }
      : null;

  const hasInsights =
    performance.length > 0 ||
    topContent.length > 0 ||
    nextAction != null ||
    publishing != null ||
    Boolean(overview?.summary?.hasData) ||
    latestBrief != null;

  let growthBrief: AssistantHomePayload["growthBrief"] = null;
  if (latestBrief) {
    const summary = toGrowthBriefSummary(latestBrief);
    const highlightLines: string[] = [];
    if (summary.engagementChangePercent != null) {
      const sign = summary.engagementChangePercent > 0 ? "+" : "";
      highlightLines.push(
        `${sign}${summary.engagementChangePercent}% engagement`
      );
    }
    if (summary.topInsightTitles[0]) {
      highlightLines.push(summary.topInsightTitles[0]);
    }
    if (summary.failedPostsCount > 0) {
      highlightLines.push(
        `${summary.failedPostsCount} publishing issue${summary.failedPostsCount === 1 ? "" : "s"}`
      );
    }
    growthBrief = {
      id: summary.id,
      briefType: summary.briefType,
      summary: summary.summary,
      generatedAt: summary.generatedAt,
      engagementChangePercent: summary.engagementChangePercent,
      failedPostsCount: summary.failedPostsCount,
      highlightLines,
      nextActionTitle: summary.nextRecommendation?.title ?? null,
      nextActionPrompt: summary.nextRecommendation?.assistantPrompt ?? null,
    };
  }

  return {
    workspaceLabel: label,
    needsClientSelection: false,
    hasInsights,
    periodLabel: "Last 30 days vs prior period",
    performance,
    topContent,
    nextAction,
    publishing,
    growthBrief,
  };
}
