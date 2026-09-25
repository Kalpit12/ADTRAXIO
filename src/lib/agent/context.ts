import { sumDailyMetric, type DailyRow } from "@/lib/analytics/aggregate";
import { parseDateRange, previousRange } from "@/lib/analytics/date-range";
import { getContentPerformance } from "@/lib/analytics/service";
import { loadBrandBrainContext } from "@/lib/assistant/brand-brain/loader";
import type { AssistantContext } from "@/lib/assistant/types";
import { buildIntelligenceAnalysis } from "@/lib/intelligence/analysis";
import { getDashboardRecommendations } from "@/lib/intelligence/recommendations";
import { listPublishingPosts } from "@/lib/publishing/service";
import type { AgentAnalysisFacts, GrowthBriefType } from "./types";
import { scopeGrowthBriefQuery } from "./scope";

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

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function periodForBriefType(briefType: GrowthBriefType): {
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  preset: "7d" | "30d";
} {
  if (briefType === "weekly") {
    const range = parseDateRange({ preset: "7d" });
    return {
      periodStart: range.from,
      periodEnd: range.to,
      periodLabel: "Last 7 days vs prior 7 days",
      preset: "7d",
    };
  }

  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 1);
  return {
    periodStart: formatUtcDate(start),
    periodEnd: formatUtcDate(end),
    periodLabel: "Recent activity (last ~48 hours)",
    preset: "7d",
  };
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

export async function gatherAgentFacts(
  ctx: AssistantContext,
  briefType: GrowthBriefType
): Promise<AgentAnalysisFacts> {
  const dataGaps: string[] = [];

  if (ctx.isAgency && !ctx.clientWorkspaceId) {
    return {
      periodLabel: briefType === "weekly" ? "Weekly" : "Daily",
      periodStart: formatUtcDate(new Date()),
      periodEnd: formatUtcDate(new Date()),
      briefType,
      dataGaps: ["Select a client workspace to generate a growth brief."],
      hasSufficientData: false,
      hasMeaningfulChange: false,
      metricChanges: [],
      failedPosts: [],
      scheduledUpcomingCount: 0,
      topContent: [],
      contentPatterns: [],
      intelligenceRecommendations: [],
      brandGoals: [],
      brandVoice: null,
    };
  }

  const periodMeta = periodForBriefType(briefType);
  const currentRange =
    briefType === "weekly"
      ? parseDateRange({ preset: "7d" })
      : { from: periodMeta.periodStart, to: periodMeta.periodEnd };
  const prevRange = previousRange(currentRange);

  const [
    currentRows,
    previousRows,
    intelligence,
    contentRows,
    recommendations,
    posts,
    brain,
  ] = await Promise.all([
    loadDailyRows(ctx, currentRange.from, currentRange.to),
    loadDailyRows(ctx, prevRange.from, prevRange.to),
    buildIntelligenceAnalysis(ctx.supabase, ctx.organizationId, {
      preset: periodMeta.preset,
      scope: ctx.scope,
    }).catch(() => null),
    getContentPerformance(ctx.supabase, ctx.organizationId, {
      preset: "7d",
      scope: ctx.scope,
    }).catch(() => []),
    getDashboardRecommendations(
      ctx.supabase,
      ctx.organizationId,
      ctx.scope,
      3
    ).catch(() => []),
    listPublishingPosts(ctx.supabase, ctx.organizationId, ctx.scope).catch(
      () => []
    ),
    loadBrandBrainContext(ctx, { mode: "strategy" }),
  ]);

  const connectedAccounts =
    intelligence?.dataAvailability.connectedAccounts ?? 0;
  if (connectedAccounts === 0) {
    dataGaps.push("No connected social platforms.");
  }
  if (currentRows.length === 0) {
    dataGaps.push("No analytics synced for the current period.");
  }

  const metrics = ["engagement", "reach", "impressions"] as const;
  const metricChanges = metrics.map((metric) => {
    const current = sumDailyMetric(currentRows, metric);
    const previous = sumDailyMetric(previousRows, metric);
    const changePercent = percentChange(current, previous);
    const meaningful =
      changePercent != null && Math.abs(changePercent) >= 10;
    return {
      metric,
      current,
      previous,
      changePercent,
      meaningful,
    };
  });

  const failedPosts = posts
    .filter((p) => p.status === "failed")
    .slice(0, 10)
    .map((p) => ({
      id: p.id,
      platform: p.platform,
      error: p.errorMessage ?? null,
    }));

  const now = Date.now();
  const weekAhead = now + 7 * 24 * 60 * 60 * 1000;
  const scheduledUpcomingCount = posts.filter((p) => {
    if (p.status !== "scheduled" && p.status !== "draft") return false;
    if (!p.scheduledFor) return p.status === "draft";
    const t = new Date(p.scheduledFor).getTime();
    return t >= now && t <= weekAhead;
  }).length;

  const sortedContent = [...contentRows].sort(
    (a, b) => (b.engagement ?? 0) - (a.engagement ?? 0)
  );
  const topContent = sortedContent.slice(0, 5).map((row) => ({
    id: row.id,
    platform: row.platform,
    headline: row.caption,
    engagement: row.engagement,
    contentType: null,
  }));

  const contentPatterns: string[] = [];
  const typeCounts = new Map<string, number>();
  for (const item of topContent) {
    if (!item.contentType) continue;
    typeCounts.set(
      item.contentType,
      (typeCounts.get(item.contentType) ?? 0) + 1
    );
  }
  for (const [type, count] of typeCounts.entries()) {
    if (count >= 2) {
      contentPatterns.push(
        `${count} of top-performing posts are "${type}" content.`
      );
    }
  }

  const hasAnalytics =
    currentRows.length > 0 ||
    Boolean(intelligence?.dataAvailability.hasAnalytics);

  const hasMeaningfulChange =
    metricChanges.some((m) => m.meaningful) ||
    failedPosts.length > 0 ||
    contentPatterns.length > 0 ||
    (scheduledUpcomingCount === 0 && hasAnalytics);

  const hasSufficientData =
    hasAnalytics || topContent.length > 0 || posts.length > 0;

  const profile = brain.profile;

  return {
    periodLabel: periodMeta.periodLabel,
    periodStart: periodMeta.periodStart,
    periodEnd: periodMeta.periodEnd,
    briefType,
    dataGaps,
    hasSufficientData,
    hasMeaningfulChange,
    metricChanges,
    failedPosts,
    scheduledUpcomingCount,
    topContent,
    contentPatterns,
    intelligenceRecommendations: recommendations.map((r) => ({
      title: r.title,
      observation: r.observation,
    })),
    brandGoals: profile?.goals ?? [],
    brandVoice: profile?.brandVoice ?? profile?.tone ?? null,
  };
}

export { scopeGrowthBriefQuery };
