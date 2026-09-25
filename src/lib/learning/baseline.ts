import { sumDailyMetric, type DailyRow } from "@/lib/analytics/aggregate";
import { parseDateRange } from "@/lib/analytics/date-range";
import { getContentPerformance } from "@/lib/analytics/service";
import type { AssistantContext } from "@/lib/assistant/types";
import type { MetricSnapshot } from "./types";

const EMPTY_CLIENT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

function scopeQuery<
  T extends { is: (c: string, v: null) => T; eq: (c: string, v: string) => T },
>(query: T, ctx: AssistantContext): T {
  if (!ctx.isAgency) return query.is("client_workspace_id", null);
  if (ctx.clientWorkspaceId) {
    return query.eq("client_workspace_id", ctx.clientWorkspaceId);
  }
  return query.eq("client_workspace_id", EMPTY_CLIENT_WORKSPACE_ID);
}

async function loadDailyRows(
  ctx: AssistantContext,
  from: string,
  to: string,
  platform?: string | null
): Promise<DailyRow[]> {
  let query = ctx.supabase
    .from("analytics_daily")
    .select(
      "metric_date, platform, impressions, reach, engagement, followers, clicks"
    )
    .eq("organization_id", ctx.organizationId)
    .gte("metric_date", from)
    .lte("metric_date", to);

  query = scopeQuery(query, ctx);
  if (platform) query = query.eq("platform", platform);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as DailyRow[];
}

export async function captureWorkspaceBaseline(
  ctx: AssistantContext,
  input: {
    windowDays: number;
    platform?: string | null;
  }
): Promise<MetricSnapshot> {
  const range = parseDateRange({ preset: input.windowDays <= 7 ? "7d" : "30d" });
  const rows = await loadDailyRows(ctx, range.from, range.to, input.platform);

  const impressions = sumDailyMetric(rows, "impressions");
  const reach = sumDailyMetric(rows, "reach");
  const engagement = sumDailyMetric(rows, "engagement");

  let postsPublished: number | null = null;
  let query = ctx.supabase
    .from("scheduled_posts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", ctx.organizationId)
    .eq("status", "published")
    .gte("published_at", range.from)
    .lte("published_at", range.to);
  query = scopeQuery(query, ctx);
  if (input.platform) query = query.eq("platform", input.platform);
  const { count } = await query;
  postsPublished = count ?? 0;

  const weeks = Math.max(input.windowDays / 7, 1);
  const publishingFrequencyPerWeek =
    postsPublished != null ? Number((postsPublished / weeks).toFixed(2)) : null;

  let campaignActiveCount: number | null = null;
  let cq = ctx.supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", ctx.organizationId)
    .neq("status", "archived");
  cq = scopeQuery(cq, ctx);
  const { count: campaignCount } = await cq;
  campaignActiveCount = campaignCount ?? 0;

  return {
    capturedAt: new Date().toISOString(),
    windowDays: input.windowDays,
    impressions,
    reach,
    engagement,
    likes: null,
    comments: null,
    shares: null,
    saves: null,
    views: null,
    postsPublished,
    publishingFrequencyPerWeek,
    campaignActiveCount,
    notes: rows.length === 0 ? ["No analytics_daily rows in baseline window."] : [],
  };
}

export async function captureContentBaseline(
  ctx: AssistantContext,
  contentId: string
): Promise<MetricSnapshot> {
  const { data } = await ctx.supabase
    .from("content_items")
    .select("id, platform")
    .eq("id", contentId)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();

  if (!data) {
    return {
      capturedAt: new Date().toISOString(),
      windowDays: 7,
      impressions: null,
      reach: null,
      engagement: null,
      likes: null,
      comments: null,
      shares: null,
      saves: null,
      views: null,
      postsPublished: null,
      publishingFrequencyPerWeek: null,
      campaignActiveCount: null,
      notes: ["Content not found for baseline."],
    };
  }

  const rows = await getContentPerformance(ctx.supabase, ctx.organizationId, {
    preset: "30d",
    scope: ctx.scope,
  }).catch(() => []);
  const row = rows.find((r) => r.id === contentId);

  return {
    capturedAt: new Date().toISOString(),
    windowDays: 7,
    impressions: row?.impressions ?? null,
    reach: row?.reach ?? null,
    engagement: row?.engagement ?? null,
    likes: null,
    comments: null,
    shares: null,
    saves: null,
    views: null,
    postsPublished: null,
    publishingFrequencyPerWeek: null,
    campaignActiveCount: null,
    notes: row ? [] : ["No content performance row at baseline."],
  };
}
