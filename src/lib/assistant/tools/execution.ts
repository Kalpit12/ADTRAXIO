import { createAndPrepareExecutionPlan } from "@/lib/execution/orchestrate";
import { buildExecutionPlanFromInput } from "@/lib/execution/plan-builder";
import { insertExecutionPlan } from "@/lib/execution/plan-service";
import { planReviewUrl } from "@/lib/execution/plan-builder";
import { getGrowthBriefById } from "@/lib/agent/brief";
import { ensureOperationalScope } from "../permissions";
import type { AssistantContext } from "../types";

export async function createExecutionPlanTool(
  ctx: AssistantContext,
  args: {
    objective?: string;
    growthBriefId?: string;
    sourceRecommendationIndex?: number;
    instructions?: string;
    prepare?: boolean;
  }
) {
  ensureOperationalScope(ctx.scope);
  const objective = args.objective?.trim();
  if (!objective) {
    return { error: "objective is required." };
  }

  if (args.prepare) {
    return createAndPrepareExecutionPlan(ctx, {
      objective,
      growthBriefId: args.growthBriefId,
      recommendationIndex: args.sourceRecommendationIndex,
      instructions: args.instructions,
    });
  }

  const growthBrief = args.growthBriefId
    ? await getGrowthBriefById(ctx, args.growthBriefId)
    : null;
  const recommendation =
    growthBrief?.recommendations[args.sourceRecommendationIndex ?? 0] ?? null;

  const built = await buildExecutionPlanFromInput(ctx, {
    objective,
    growthBrief,
    recommendation,
    recommendationIndex: args.sourceRecommendationIndex,
    instructions: args.instructions,
  });

  const plan = await insertExecutionPlan(ctx, {
    title: built.title,
    objective: built.objective,
    growthBriefId: args.growthBriefId ?? null,
    plan: built.plan,
    status: "draft",
  });

  return {
    planId: plan.id,
    title: plan.title,
    objective: plan.objective,
    steps: plan.plan.steps.map((s) => ({
      id: s.id,
      type: s.type,
      title: s.title,
      status: s.status,
    })),
    reviewUrl: planReviewUrl(plan.id),
    message: "Execution plan created. Nothing has been executed.",
  };
}
