import {
  getAnalyticsOverview,
  getContentPerformance,
} from "@/lib/analytics/service";
import { ensureOperationalScope } from "../permissions";
import type { AssistantContext, DateRangePreset } from "../types";

function parseDateRange(input: { dateRange?: string; preset?: string }) {
  const preset = (input.dateRange ?? input.preset ?? "30d") as DateRangePreset;
  return { preset };
}

export async function getAnalyticsOverviewTool(
  ctx: AssistantContext,
  args: { dateRange?: string; platform?: string }
) {
  ensureOperationalScope(ctx.scope);
  const range = parseDateRange(args);
  const overview = await getAnalyticsOverview(ctx.supabase, ctx.organizationId, {
    preset: range.preset,
    platform: args.platform ?? null,
    scope: ctx.scope,
  });
  return overview;
}

export async function getTopContentTool(
  ctx: AssistantContext,
  args: { dateRange?: string; platform?: string; limit?: number }
) {
  ensureOperationalScope(ctx.scope);
  const range = parseDateRange(args);
  const rows = await getContentPerformance(ctx.supabase, ctx.organizationId, {
    preset: range.preset,
    platform: args.platform ?? null,
    scope: ctx.scope,
  });

  const limit = Math.min(Math.max(args.limit ?? 5, 1), 20);
  const sorted = [...rows].sort(
    (a, b) => (b.engagement ?? 0) - (a.engagement ?? 0)
  );

  return sorted.slice(0, limit).map((row) => ({
    id: row.id,
    platform: row.platform,
    caption: row.caption,
    impressions: row.impressions,
    reach: row.reach,
    engagement: row.engagement,
    engagementRate: row.engagementRate,
    publishedAt: row.publishedAt,
    accountName: row.accountName,
  }));
}

export async function getContentPerformanceTool(
  ctx: AssistantContext,
  args: { contentId: string }
) {
  ensureOperationalScope(ctx.scope);
  if (!args.contentId?.trim()) {
    return { error: "contentId is required." };
  }

  const range = parseDateRange({ dateRange: "30d" });
  const rows = await getContentPerformance(ctx.supabase, ctx.organizationId, {
    preset: range.preset,
    scope: ctx.scope,
  });

  const match = rows.find((r) => r.id === args.contentId);
  if (!match) {
    return { error: "No performance data found for this content." };
  }

  return match;
}
