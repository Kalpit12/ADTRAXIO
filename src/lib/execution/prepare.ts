import { generateContentWithAI } from "@/lib/ai/generate-content";
import { enrichBriefWithBrandBrain } from "@/lib/assistant/tools/brand-brain";
import { saveContentDraftFromAssistant } from "@/lib/assistant/content-persistence";
import { createCampaign } from "@/lib/campaigns/service";
import { getConnectedAccounts } from "@/lib/social/service";
import type { AssistantContext } from "@/lib/assistant/types";
import type { ContentPlatform, CreativeBrief } from "@/lib/content/types";
import { appendAuditEntry } from "./audit";
import { recordExecutionAiGeneration } from "./usage";
import {
  assertPrepareEntitlements,
  entitlementErrorMessage,
} from "./entitlements-check";
import { getExecutionPlan, updateExecutionPlan } from "./plan-service";
import { runRepurposeContentStep } from "./repurpose-step";
import type { ExecutionPlanStep } from "./types";

function nextWeekdaySlots(count: number): string[] {
  const slots: string[] = [];
  const base = new Date();
  base.setUTCHours(10, 0, 0, 0);
  let added = 0;
  let day = 1;
  while (added < count && day < 14) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + day);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      slots.push(d.toISOString());
      added += 1;
    }
    day += 1;
  }
  return slots;
}

function collectContentIds(steps: ExecutionPlanStep[]): string[] {
  const ids: string[] = [];
  for (const step of steps) {
    for (const id of step.result?.contentIds ?? []) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

async function runCreateContentStep(
  ctx: AssistantContext,
  step: ExecutionPlanStep
): Promise<ExecutionPlanStep> {
  if (step.result?.contentIds?.length) {
    return { ...step, status: "ready" };
  }

  const count = Number(step.input.count ?? 1);
  const platforms = (step.input.platforms as ContentPlatform[]) ?? ["instagram"];
  const topic = String(step.input.topic ?? "Educational content");
  const tone = String(step.input.tone ?? "professional");
  const audience = String(step.input.audience ?? "");
  const goal = String(step.input.goal ?? "engagement");
  const contentIds: string[] = [];

  for (let i = 0; i < Math.min(count, 5); i++) {
    const platform = platforms[i % platforms.length] ?? "instagram";
    const brief: CreativeBrief = {
      contentType: "social_post",
      goal: goal as CreativeBrief["goal"],
      platform,
      audience,
      tone: tone as CreativeBrief["tone"],
      topic: `${topic} (variation ${i + 1})`,
      additionalContext: String(step.input.instructions ?? ""),
      cta: "",
    };
    const enriched = await enrichBriefWithBrandBrain(ctx, brief);
    const creative = await generateContentWithAI(enriched);
    const saved = await saveContentDraftFromAssistant(ctx, {
      brief: enriched,
      creative,
    });
    if ("contentId" in saved) {
      contentIds.push(saved.contentId);
      await recordExecutionAiGeneration(ctx);
    }
  }

  if (contentIds.length === 0) {
    return {
      ...step,
      status: "failed",
      error: "Unable to create content drafts.",
    };
  }

  return {
    ...step,
    status: "ready",
    result: { contentIds },
  };
}

async function runCreateCampaignStep(
  ctx: AssistantContext,
  step: ExecutionPlanStep
): Promise<ExecutionPlanStep> {
  if (step.result?.campaignId) {
    return { ...step, status: "ready" };
  }

  const name = String(step.input.name ?? "Campaign draft");
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
    status: "ready",
    result: { campaignId: campaign.id, message: "Campaign draft created." },
  };
}

async function runPrepareScheduleStep(
  ctx: AssistantContext,
  step: ExecutionPlanStep,
  contentIds: string[]
): Promise<ExecutionPlanStep> {
  if (step.result?.scheduleItems?.length) {
    return { ...step, status: "ready" };
  }

  const accounts = await getConnectedAccounts(
    ctx.supabase,
    ctx.organizationId,
    ctx.scope
  );
  const connected = accounts.filter((a) => a.status === "connected");
  if (connected.length === 0 || contentIds.length === 0) {
    return {
      ...step,
      status: "needs_review",
      error: "No connected accounts or content for schedule preparation.",
    };
  }

  const slots = nextWeekdaySlots(contentIds.length);
  const timezone = String(step.input.timezone ?? "UTC");
  const scheduleItems = contentIds.map((contentId, index) => {
    const account = connected[index % connected.length];
    return {
      contentId,
      socialAccountId: account.id,
      platform: account.platform,
      scheduledFor: slots[index] ?? slots[0],
      timezone,
    };
  });

  return {
    ...step,
    status: "ready",
    result: { scheduleItems },
  };
}

export async function prepareExecutionPlan(
  ctx: AssistantContext,
  planId: string
): Promise<{ plan: Awaited<ReturnType<typeof getExecutionPlan>>; errors: string[] }> {
  const plan = await getExecutionPlan(ctx, planId);
  if (!plan) return { plan: null, errors: ["Plan not found."] };

  const errors: string[] = [];
  let planJson = plan.plan;
  const steps = [...planJson.steps];

  try {
    await assertPrepareEntitlements(ctx.supabase, ctx.organizationId, steps);
  } catch (error) {
    return {
      plan,
      errors: [entitlementErrorMessage(error)],
    };
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (
      (step.status === "completed" || step.status === "ready") &&
      (step.result?.contentIds?.length ||
        step.result?.campaignId ||
        step.result?.scheduleItems?.length)
    ) {
      continue;
    }
    if (step.type === "analyze") continue;

    steps[i] = { ...step, status: "processing" };
    try {
      if (step.type === "create_content") {
        steps[i] = await runCreateContentStep(ctx, step);
      } else if (step.type === "repurpose_content") {
        steps[i] = await runRepurposeContentStep(ctx, step);
      } else if (step.type === "create_campaign") {
        steps[i] = await runCreateCampaignStep(ctx, step);
      } else if (step.type === "prepare_schedule") {
        const contentIds = collectContentIds(steps);
        steps[i] = await runPrepareScheduleStep(ctx, step, contentIds);
      } else {
        steps[i] = { ...step, status: "skipped" };
      }
      planJson = appendAuditEntry(planJson, {
        actorId: ctx.user.id,
        action: "step_prepared",
        stepId: steps[i].id,
        success: steps[i].status === "ready",
        error: steps[i].error ?? undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Step failed.";
      errors.push(message);
      steps[i] = { ...step, status: "failed", error: message };
      planJson = appendAuditEntry(planJson, {
        actorId: ctx.user.id,
        action: "step_prepare_failed",
        stepId: step.id,
        success: false,
        error: message,
      });
    }
  }

  planJson = { ...planJson, steps };
  planJson = appendAuditEntry(planJson, {
    actorId: ctx.user.id,
    action: "prepare_finished",
    success: errors.length === 0,
  });

  const updated = await updateExecutionPlan(ctx, planId, {
    plan: planJson,
    status: "review",
  });

  return { plan: updated, errors };
}
