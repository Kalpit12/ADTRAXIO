import { getGrowthBriefById } from "@/lib/agent/brief";
import { createNotification } from "@/lib/collaboration/notifications";
import { ensureOperationalScope } from "@/lib/assistant/permissions";
import type { AssistantContext } from "@/lib/assistant/types";
import {
  buildExecutionPlanFromInput,
  recommendationSupportsPrepare,
} from "./plan-builder";
import { insertExecutionPlan } from "./plan-service";
import { prepareExecutionPlan } from "./prepare";
import { planReviewUrl } from "./plan-builder";

export async function createAndPrepareExecutionPlan(
  ctx: AssistantContext,
  input: {
    objective: string;
    growthBriefId?: string;
    recommendationIndex?: number;
    instructions?: string;
  }
) {
  ensureOperationalScope(ctx.scope);

  let growthBrief = null;
  if (input.growthBriefId) {
    growthBrief = await getGrowthBriefById(ctx, input.growthBriefId);
  }

  let recommendation =
    growthBrief?.recommendations[input.recommendationIndex ?? 0] ?? null;
  if (
    recommendation &&
    !recommendationSupportsPrepare(recommendation)
  ) {
    return { error: "This recommendation does not support automated preparation." };
  }

  const built = await buildExecutionPlanFromInput(ctx, {
    objective: input.objective,
    growthBrief,
    recommendation,
    recommendationIndex: input.recommendationIndex,
    instructions: input.instructions,
  });

  const plan = await insertExecutionPlan(ctx, {
    title: built.title,
    objective: built.objective,
    growthBriefId: input.growthBriefId ?? null,
    plan: built.plan,
    status: "draft",
  });

  const { plan: prepared, errors } = await prepareExecutionPlan(ctx, plan.id);

  await createNotification(ctx.supabase, {
    organizationId: ctx.organizationId,
    recipientId: ctx.user.id,
    clientWorkspaceId: ctx.clientWorkspaceId,
    type: "execution_plan_ready",
    title: "Execution plan ready for review",
    body: built.title,
    entityType: "ai_execution_plan",
    entityId: plan.id,
  });

  return {
    plan: prepared,
    reviewUrl: planReviewUrl(plan.id),
    preparationErrors: errors,
  };
}
