import { recordActivity } from "@/lib/collaboration/activity";
import { createNotification } from "@/lib/collaboration/notifications";
import { createCampaign } from "@/lib/campaigns/service";
import { schedulePost } from "@/lib/publishing/service";
import type { AssistantContext } from "@/lib/assistant/types";
import { appendAuditEntry } from "./audit";
import {
  assertExecuteEntitlements,
  entitlementErrorMessage,
} from "./entitlements-check";
import {
  claimExecutionLock,
  getExecutionPlan,
  isPlanExpired,
  releaseExecutionLockStatus,
  updateExecutionPlan,
} from "./plan-service";
import { validateStepBeforeExecute } from "./validate-state";
import { queueEvaluationAfterExecution } from "@/lib/evaluation/integration";
import { captureLearningBaselinesAfterExecution } from "@/lib/learning/integration";
import type { ExecutionPlanStep } from "./types";

async function executeScheduleStep(
  ctx: AssistantContext,
  step: ExecutionPlanStep
): Promise<ExecutionPlanStep> {
  const items = step.result?.scheduleItems ?? [];
  const updatedItems = [];

  for (const item of items) {
    if (item.scheduledPostId) {
      updatedItems.push(item);
      continue;
    }

    const scheduled = await schedulePost(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      request: {
        socialAccountId: item.socialAccountId,
        contentId: item.contentId,
        caption: item.caption ?? "",
        mediaUrl: null,
        scheduledFor: item.scheduledFor,
        timezone: item.timezone ?? "UTC",
      },
      scope: ctx.scope,
    });

    updatedItems.push({
      ...item,
      scheduledPostId: scheduled.id,
    });
  }

  return {
    ...step,
    status: "completed",
    executedAt: new Date().toISOString(),
    result: { ...step.result, scheduleItems: updatedItems },
  };
}

async function executeCampaignStep(
  ctx: AssistantContext,
  step: ExecutionPlanStep
): Promise<ExecutionPlanStep> {
  if (step.result?.campaignId) {
    return {
      ...step,
      status: "completed",
      executedAt: step.executedAt ?? new Date().toISOString(),
    };
  }
  const name = String(step.input.name ?? "Campaign");
  const campaign = await createCampaign(
    ctx.supabase,
    ctx.organizationId,
    ctx.user.id,
    {
      name,
      objective:
        (step.input.objective as "awareness" | "engagement" | "leads" | "sales") ??
        "engagement",
      description: (step.input.description as string) ?? null,
      status: "draft",
    },
    ctx.scope
  );
  return {
    ...step,
    status: "completed",
    executedAt: new Date().toISOString(),
    result: { campaignId: campaign.id },
  };
}

function shouldRunStep(
  step: ExecutionPlanStep,
  targetIds: Set<string> | null,
  retryFailedOnly: boolean
): boolean {
  if (targetIds && !targetIds.has(step.id)) return false;
  if (step.status === "completed" || step.status === "skipped") return false;
  if (retryFailedOnly && step.status !== "failed" && step.status !== "needs_review") {
    return false;
  }
  if (!step.approved && step.requiresConfirmation) return false;
  return true;
}

export async function executeApprovedSteps(
  ctx: AssistantContext,
  planId: string,
  options?: { stepIds?: string[]; retryFailedOnly?: boolean }
): Promise<{
  plan: Awaited<ReturnType<typeof getExecutionPlan>>;
  results: Array<{ stepId: string; success: boolean; error?: string }>;
}> {
  const plan = await getExecutionPlan(ctx, planId);
  if (!plan) {
    return { plan: null, results: [{ stepId: "", success: false, error: "Not found." }] };
  }
  if (isPlanExpired(plan)) {
    return {
      plan,
      results: [{ stepId: "", success: false, error: "Plan expired." }],
    };
  }

  const lock = await claimExecutionLock(ctx, planId);
  if (!lock.ok) {
    return {
      plan: lock.plan ?? plan,
      results: [{ stepId: "", success: false, error: lock.error }],
    };
  }

  let planJson = lock.plan.plan;
  const steps = [...planJson.steps];
  const results: Array<{ stepId: string; success: boolean; error?: string }> = [];
  const targetIds = options?.stepIds?.length ? new Set(options.stepIds) : null;

  try {
    await assertExecuteEntitlements(
      ctx.supabase,
      ctx.organizationId,
      steps.filter((s) => shouldRunStep(s, targetIds, Boolean(options?.retryFailedOnly)))
    );
  } catch (error) {
    const message = entitlementErrorMessage(error);
    planJson = appendAuditEntry(planJson, {
      actorId: ctx.user.id,
      action: "execute_blocked",
      detail: message,
      success: false,
      error: message,
    });
    await updateExecutionPlan(ctx, planId, {
      plan: planJson,
      status: "review",
    });
    return {
      plan: { ...lock.plan, plan: planJson, status: "review" },
      results: [{ stepId: "", success: false, error: message }],
    };
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (
      !shouldRunStep(step, targetIds, Boolean(options?.retryFailedOnly))
    ) {
      continue;
    }

    const validation = await validateStepBeforeExecute(ctx, step);
    if (!validation.ok) {
      steps[i] = {
        ...step,
        status: "needs_review",
        error: validation.message,
      };
      results.push({ stepId: step.id, success: false, error: validation.message });
      planJson = appendAuditEntry(planJson, {
        actorId: ctx.user.id,
        action: "step_needs_review",
        stepId: step.id,
        detail: validation.message,
        success: false,
      });
      continue;
    }

    try {
      if (step.type === "create_content" || step.type === "repurpose_content") {
        if (step.result?.contentIds?.length) {
          steps[i] = {
            ...step,
            status: "completed",
            executedAt: new Date().toISOString(),
          };
          results.push({ stepId: step.id, success: true });
          planJson = appendAuditEntry(planJson, {
            actorId: ctx.user.id,
            action: "step_completed",
            stepId: step.id,
            detail: "Content drafts verified.",
            success: true,
          });
        } else {
          steps[i] = { ...step, status: "needs_review", error: "No drafts." };
          results.push({ stepId: step.id, success: false, error: "No drafts." });
        }
      } else if (step.type === "create_campaign" && step.approved) {
        steps[i] = await executeCampaignStep(ctx, step);
        results.push({
          stepId: step.id,
          success: steps[i].status === "completed",
        });
        planJson = appendAuditEntry(planJson, {
          actorId: ctx.user.id,
          action: "step_executed",
          stepId: step.id,
          detail: "Campaign draft",
          success: steps[i].status === "completed",
          error: steps[i].error ?? undefined,
        });
      } else if (step.type === "prepare_schedule" && step.approved) {
        steps[i] = await executeScheduleStep(ctx, step);
        results.push({
          stepId: step.id,
          success: steps[i].status === "completed",
          error: steps[i].error ?? undefined,
        });
        planJson = appendAuditEntry(planJson, {
          actorId: ctx.user.id,
          action: "step_executed",
          stepId: step.id,
          detail: "Schedule posts",
          success: steps[i].status === "completed",
          error: steps[i].error ?? undefined,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Execution failed.";
      steps[i] = { ...step, status: "failed", error: message };
      results.push({ stepId: step.id, success: false, error: message });
      planJson = appendAuditEntry(planJson, {
        actorId: ctx.user.id,
        action: "step_failed",
        stepId: step.id,
        success: false,
        error: message,
      });
    }
  }

  planJson = { ...planJson, steps };
  const status = releaseExecutionLockStatus(lock.plan, results);

  planJson = appendAuditEntry(planJson, {
    actorId: ctx.user.id,
    action: "execute_finished",
    detail: status,
    success: status === "completed",
  });

  const updated = await updateExecutionPlan(ctx, planId, {
    plan: planJson,
    status,
  });

  if (updated) {
    await recordActivity(ctx.supabase, {
      organizationId: ctx.organizationId,
      clientWorkspaceId: ctx.clientWorkspaceId,
      actorId: ctx.user.id,
      entityType: "ai_execution_plan",
      entityId: planId,
      action: "executed",
      metadata: {
        results,
        status,
        approvedSteps: steps
          .filter((s) => s.approved)
          .map((s) => ({ id: s.id, type: s.type, approvedBy: s.approvedBy })),
      },
    });

    if (updated) {
      try {
        await captureLearningBaselinesAfterExecution(ctx, updated, steps);
      } catch {
        /* learning capture must not block execution */
      }
      try {
        await queueEvaluationAfterExecution(ctx, updated);
      } catch {
        /* evaluation queue must not block execution */
      }
    }

    if (status === "completed" || status === "partially_completed") {
      await createNotification(ctx.supabase, {
        organizationId: ctx.organizationId,
        recipientId: ctx.user.id,
        clientWorkspaceId: ctx.clientWorkspaceId,
        type: "execution_plan_completed",
        title:
          status === "completed"
            ? "Execution plan completed"
            : "Execution plan partially completed",
        body: updated.title,
        entityType: "ai_execution_plan",
        entityId: planId,
      });
    }
  }

  return { plan: updated, results };
}
