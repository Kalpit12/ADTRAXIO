import {
  getDashboardRecommendations,
  getLatestOverview,
  listRecommendations,
} from "@/lib/intelligence/recommendations";
import { ensureOperationalScope } from "../permissions";
import type { AssistantContext } from "../types";

export async function getRecommendationsTool(ctx: AssistantContext) {
  ensureOperationalScope(ctx.scope);
  const recommendations = await listRecommendations(
    ctx.supabase,
    ctx.organizationId,
    ctx.scope,
    { status: "new", limit: 10 }
  );
  return recommendations.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    observation: r.observation,
    recommendation: r.recommendation,
    confidence: r.confidence,
    priority: r.priority,
    status: r.status,
    evidence: r.evidence,
  }));
}

export async function getIntelligenceOverviewTool(ctx: AssistantContext) {
  ensureOperationalScope(ctx.scope);
  const overview = await getLatestOverview(
    ctx.supabase,
    ctx.organizationId,
    ctx.scope
  );
  if (!overview) {
    return { available: false, message: "No intelligence overview available." };
  }
  const dashboardRecs = await getDashboardRecommendations(
    ctx.supabase,
    ctx.organizationId,
    ctx.scope
  );
  return { available: true, overview, dashboardRecommendations: dashboardRecs };
}
