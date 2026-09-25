import { captureWorkspaceBaseline } from "@/lib/learning/baseline";
import { listOutcomesForExecutionPlan } from "@/lib/learning/service";
import type { MetricSnapshot } from "@/lib/learning/types";
import type { AssistantContext } from "@/lib/assistant/types";

export async function captureEvaluationBaseline(
  ctx: AssistantContext,
  executionPlanId: string | null
): Promise<MetricSnapshot> {
  if (executionPlanId) {
    const outcomes = await listOutcomesForExecutionPlan(ctx, executionPlanId);
    const planLevel = outcomes.find((o) => o.idempotencyKey.endsWith(":plan"));
    if (planLevel?.baseline) return planLevel.baseline;
  }
  return captureWorkspaceBaseline(ctx, { windowDays: 14 });
}

export async function captureEvaluationOutcome(
  ctx: AssistantContext,
  executionPlanId: string | null
): Promise<MetricSnapshot> {
  if (executionPlanId) {
    const outcomes = await listOutcomesForExecutionPlan(ctx, executionPlanId);
    const planLevel = outcomes.find((o) => o.idempotencyKey.endsWith(":plan"));
    if (planLevel?.status === "measured" && planLevel.outcome) {
      return planLevel.outcome;
    }
  }
  return captureWorkspaceBaseline(ctx, { windowDays: 14 });
}
