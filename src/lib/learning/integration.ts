import type { AssistantContext } from "@/lib/assistant/types";
import type { ExecutionPlanRecord, ExecutionPlanStep } from "@/lib/execution/types";
import { captureContentBaseline, captureWorkspaceBaseline } from "./baseline";
import { insertLearningOutcome } from "./service";
import { OUTCOME_WINDOW_DAYS } from "./types";

async function resolveStrategicPlanId(
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

function windowDaysForStep(step: ExecutionPlanStep): number {
  if (step.type === "create_campaign") return OUTCOME_WINDOW_DAYS.campaign;
  if (step.type === "prepare_schedule") return OUTCOME_WINDOW_DAYS.post;
  if (step.type === "create_content" || step.type === "repurpose_content") {
    return OUTCOME_WINDOW_DAYS.content;
  }
  return OUTCOME_WINDOW_DAYS.default;
}

export async function captureLearningBaselinesAfterExecution(
  ctx: AssistantContext,
  plan: ExecutionPlanRecord,
  steps: ExecutionPlanStep[]
): Promise<void> {
  if (plan.status !== "completed" && plan.status !== "partially_completed") {
    return;
  }

  const strategicPlanId = await resolveStrategicPlanId(ctx, plan.id);

  for (const step of steps) {
    if (step.status !== "completed" && step.status !== "failed") continue;

    const windowDays = windowDaysForStep(step);
    const objective = `${plan.objective} — ${step.title}`;
    const baseKey = `${plan.id}:${step.id}`;

    if (step.type === "create_content" || step.type === "repurpose_content") {
      const ids = step.result?.contentIds ?? [];
      for (const contentId of ids) {
        const baseline = await captureContentBaseline(ctx, contentId);
        await insertLearningOutcome(ctx, {
          idempotencyKey: `${baseKey}:content:${contentId}`,
          objective,
          sourceType: "execution_step",
          sourceId: plan.id,
          strategicPlanId,
          executionPlanId: plan.id,
          executionStepId: step.id,
          contentId,
          platform: String(
            (step.input.platforms as string[])?.[0] ??
              (step.input.targetPlatforms as string[])?.[0] ??
              ""
          ),
          baseline,
          windowDays,
          status: step.status === "failed" ? "insufficient_data" : "pending",
        });
      }
      if (!ids.length && step.status === "failed") {
        const baseline = await captureWorkspaceBaseline(ctx, { windowDays });
        await insertLearningOutcome(ctx, {
          idempotencyKey: `${baseKey}:failed`,
          objective,
          sourceType: "execution_step",
          sourceId: plan.id,
          strategicPlanId,
          executionPlanId: plan.id,
          executionStepId: step.id,
          baseline,
          windowDays,
          status: "insufficient_data",
        });
      }
    } else if (step.type === "create_campaign" && step.result?.campaignId) {
      const baseline = await captureWorkspaceBaseline(ctx, { windowDays });
      await insertLearningOutcome(ctx, {
        idempotencyKey: `${baseKey}:campaign:${step.result.campaignId}`,
        objective,
        sourceType: "execution_step",
        sourceId: plan.id,
        strategicPlanId,
        executionPlanId: plan.id,
        executionStepId: step.id,
        campaignId: step.result.campaignId,
        baseline,
        windowDays,
        status: "pending",
      });
    } else if (step.type === "prepare_schedule") {
      const items = step.result?.scheduleItems ?? [];
      for (const item of items) {
        if (!item.scheduledPostId) continue;
        const baseline = await captureWorkspaceBaseline(ctx, {
          windowDays,
          platform: item.platform,
        });
        await insertLearningOutcome(ctx, {
          idempotencyKey: `${baseKey}:schedule:${item.scheduledPostId}`,
          objective,
          sourceType: "execution_step",
          sourceId: plan.id,
          strategicPlanId,
          executionPlanId: plan.id,
          executionStepId: step.id,
          scheduledPostId: item.scheduledPostId,
          contentId: item.contentId,
          platform: item.platform,
          baseline,
          windowDays,
          status: "pending",
        });
      }
    }
  }

  const planBaseline = await captureWorkspaceBaseline(ctx, {
    windowDays: OUTCOME_WINDOW_DAYS.execution_plan,
  });
  await insertLearningOutcome(ctx, {
    idempotencyKey: `${plan.id}:plan`,
    objective: plan.objective,
    sourceType: "execution_plan",
    sourceId: plan.id,
    strategicPlanId,
    executionPlanId: plan.id,
    baseline: planBaseline,
    windowDays: OUTCOME_WINDOW_DAYS.execution_plan,
    status: plan.status === "partially_completed" ? "pending" : "pending",
  });
}
