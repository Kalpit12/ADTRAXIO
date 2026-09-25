import { ensureOperationalScope } from "../permissions";
import type { AssistantContext } from "../types";
import { createStrategicPlan } from "@/lib/strategist/service";
import { strategicPlanReviewUrl } from "@/lib/strategist/plan-builder";
import type { StrategyType } from "@/lib/strategist/types";

export async function createStrategicPlanTool(
  ctx: AssistantContext,
  args: {
    objective?: string;
    strategyType?: StrategyType;
    growthBriefId?: string;
    instructions?: string;
    includeAlternatives?: boolean;
  }
) {
  ensureOperationalScope(ctx.scope);
  const objective = args.objective?.trim();
  if (!objective) {
    return { error: "objective is required." };
  }

  const { plan, meta } = await createStrategicPlan(ctx, {
    objective,
    strategyType: args.strategyType,
    growthBriefId: args.growthBriefId,
    instructions: args.instructions,
    includeAlternatives: args.includeAlternatives,
  });

  const adaptiveMsg =
    meta.learningCount > 0
      ? `Based on ${meta.learningCount} validated learning(s), this strategy includes ${meta.adaptationCount} adaptation(s).`
      : "There is not enough validated historical evidence yet, so this strategy is based primarily on current performance.";

  return {
    planId: plan.id,
    objective: plan.objective,
    strategyType: plan.strategyType,
    confidence: plan.confidence,
    summary: plan.plan.summary,
    evidenceCount: plan.evidence.length,
    actionCount: plan.plan.actions.length,
    learningCount: meta.learningCount,
    adaptationCount: meta.adaptationCount,
    learningIds: meta.learningIds,
    reviewUrl: strategicPlanReviewUrl(plan.id),
    message: `${adaptiveMsg} Review evidence and approve actions before preparing execution. Nothing has been executed.`,
  };
}
