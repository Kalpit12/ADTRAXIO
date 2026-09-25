import type { AssistantContext } from "@/lib/assistant/types";
import type { ExecutionPlanRecord } from "@/lib/execution/types";
import { queueStrategyEvaluation } from "./service";

async function findStrategicPlanId(
  ctx: AssistantContext,
  executionPlanId: string
): Promise<string | null> {
  const { data: row } = await ctx.supabase
    .from("ai_strategic_plans")
    .select("id, plan_json")
    .eq("organization_id", ctx.organizationId);

  for (const plan of row ?? []) {
    const json = plan.plan_json as { executionPlanId?: string };
    if (json?.executionPlanId === executionPlanId) return plan.id;
  }
  return null;
}

export async function queueEvaluationAfterExecution(
  ctx: AssistantContext,
  plan: ExecutionPlanRecord
): Promise<void> {
  if (plan.status !== "completed" && plan.status !== "partially_completed") {
    return;
  }

  const strategicPlanId = await findStrategicPlanId(ctx, plan.id);
  if (!strategicPlanId) return;

  await queueStrategyEvaluation(ctx, {
    strategicPlanId,
    executionPlanId: plan.id,
  });
}
