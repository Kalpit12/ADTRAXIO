import { gatherAgentFacts } from "@/lib/agent/context";
import { getGrowthBriefById } from "@/lib/agent/brief";
import { getCompactBrandPrompt } from "@/lib/assistant/brand-brain/loader";
import type { AssistantContext } from "@/lib/assistant/types";
import { getContentPerformance } from "@/lib/analytics/service";
import { getConnectedAccounts } from "@/lib/social/service";
import { listCampaigns } from "@/lib/campaigns/service";
import { listPublishingPosts } from "@/lib/publishing/service";
import { getDashboardRecommendations } from "@/lib/intelligence/recommendations";
import type { GrowthBriefRecord } from "@/lib/agent/types";
import type { RelevantLearning } from "@/lib/learning/relevance";
import {
  detectMixedEvidence,
  formatRelevantLearningsForPrompt,
} from "@/lib/learning/relevance";
import type { StrategyEvaluationRecord } from "@/lib/evaluation/types";
import { formatEvaluatedStrategiesForPrompt } from "@/lib/evaluation/context";

export interface StrategistContextBundle {
  facts: Awaited<ReturnType<typeof gatherAgentFacts>>;
  brandBrainPrompt: string;
  connectedPlatforms: string[];
  topContent: Array<{
    id: string;
    title: string;
    platform: string;
    engagement: number | null;
  }>;
  campaignCount: number;
  scheduledUpcoming: number;
  intelligenceRecommendations: unknown;
  growthBrief: GrowthBriefRecord | null;
  dataGaps: string[];
  historicalLearningsPrompt: string;
  relevantLearnings: RelevantLearning[];
  mixedHistoricalEvidence: boolean;
  strategyEvaluationsPrompt: string;
  evaluatedStrategies: StrategyEvaluationRecord[];
  experimentEvidencePrompt: string;
  experimentEvaluationsPrompt: string;
  crossExperimentEvidencePrompt: string;
  crossExperimentLearningsPrompt: string;
  optimizationOutcomesPrompt: string;
}

export async function gatherStrategistContext(
  ctx: AssistantContext,
  input: {
    growthBriefId?: string;
    relevantLearnings?: RelevantLearning[];
    evaluatedStrategies?: StrategyEvaluationRecord[];
    experimentEvidencePrompt?: string;
    experimentEvaluationsPrompt?: string;
    crossExperimentEvidencePrompt?: string;
    crossExperimentLearningsPrompt?: string;
    optimizationOutcomesPrompt?: string;
  }
): Promise<StrategistContextBundle> {
  const dataGaps: string[] = [];

  const facts = await gatherAgentFacts(ctx, "weekly");
  dataGaps.push(...facts.dataGaps);

  const brandBrainPrompt = await getCompactBrandPrompt(ctx, { mode: "strategy" });

  const accounts = await getConnectedAccounts(
    ctx.supabase,
    ctx.organizationId,
    ctx.scope
  ).catch(() => []);
  const connectedPlatforms = accounts
    .filter((a) => a.status === "connected")
    .map((a) => a.platform);

  const performance = await getContentPerformance(ctx.supabase, ctx.organizationId, {
    preset: "30d",
    scope: ctx.scope,
  }).catch(() => []);

  const topContent = [...performance]
    .sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0))
    .slice(0, 8)
    .map((row) => ({
      id: row.id,
      title: row.caption?.slice(0, 80) ?? row.id,
      platform: row.platform,
      engagement: row.engagement ?? null,
    }));

  const campaigns = await listCampaigns(ctx.supabase, ctx.organizationId, {
    scope: ctx.scope,
  }).catch(() => []);

  const posts = await listPublishingPosts(
    ctx.supabase,
    ctx.organizationId,
    ctx.scope
  ).catch(() => []);
  const scheduledUpcoming = posts.filter((p) => p.status === "scheduled").length;

  const intelligenceRecommendations = await getDashboardRecommendations(
    ctx.supabase,
    ctx.organizationId,
    ctx.scope
  ).catch(() => []);

  let growthBrief: GrowthBriefRecord | null = null;
  if (input.growthBriefId) {
    growthBrief = await getGrowthBriefById(ctx, input.growthBriefId);
    if (!growthBrief) dataGaps.push("Growth brief not found for this workspace.");
  }

  if (!connectedPlatforms.length) {
    dataGaps.push("No connected social accounts in this workspace.");
  }
  if (!topContent.length) {
    dataGaps.push("Limited content performance data in the last 30 days.");
  }

  const relevantLearnings = input.relevantLearnings ?? [];
  const historicalLearningsPrompt = formatRelevantLearningsForPrompt(relevantLearnings);
  const evaluatedStrategies = input.evaluatedStrategies ?? [];
  const strategyEvaluationsPrompt =
    formatEvaluatedStrategiesForPrompt(evaluatedStrategies);
  const experimentEvidencePrompt =
    input.experimentEvidencePrompt ??
    "No completed experiment intelligence available.";
  const experimentEvaluationsPrompt =
    input.experimentEvaluationsPrompt ??
    "No normalized experiment evaluations available.";
  const crossExperimentEvidencePrompt =
    input.crossExperimentEvidencePrompt ??
    "No cross-experiment evidence aggregation available.";
  const crossExperimentLearningsPrompt =
    input.crossExperimentLearningsPrompt ??
    "No experiment-linked learnings available.";
  const optimizationOutcomesPrompt =
    input.optimizationOutcomesPrompt ?? "OPTIMIZATION OUTCOMES: None measured yet.";
  return {
    facts,
    brandBrainPrompt,
    connectedPlatforms,
    topContent,
    campaignCount: campaigns.length,
    scheduledUpcoming,
    intelligenceRecommendations,
    growthBrief,
    dataGaps,
    historicalLearningsPrompt,
    relevantLearnings,
    mixedHistoricalEvidence: detectMixedEvidence(relevantLearnings),
    strategyEvaluationsPrompt,
    evaluatedStrategies,
    experimentEvidencePrompt,
    experimentEvaluationsPrompt,
    crossExperimentEvidencePrompt,
    crossExperimentLearningsPrompt,
    optimizationOutcomesPrompt,
  };
}
