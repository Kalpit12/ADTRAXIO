import type {
  ExecutionPlanJson,
  ExecutionPlanStep,
  ExecutionStepResult,
} from "./types";

const ALLOWED_STEP_TYPES = new Set([
  "analyze",
  "create_content",
  "create_campaign",
  "prepare_schedule",
  "publish",
  "schedule",
  "create_report",
  "repurpose_content",
]);

export function applyStepPatches(
  plan: ExecutionPlanJson,
  patches: Array<{
    stepId: string;
    approved?: boolean;
    input?: Record<string, unknown>;
    scheduleItems?: ExecutionStepResult["scheduleItems"];
  }>,
  actorId?: string
): ExecutionPlanJson {
  const steps = plan.steps.map((step) => {
    const patch = patches.find((p) => p.stepId === step.id);
    if (!patch) return step;
    const next: ExecutionPlanStep = { ...step };
    if (patch.approved !== undefined) {
      next.approved = Boolean(patch.approved);
      if (next.approved) {
        next.approvedBy = actorId ?? next.approvedBy ?? null;
        next.approvedAt = new Date().toISOString();
        if (next.status === "ready" || next.status === "failed") {
          next.status = "approved";
        }
      } else {
        next.approvedBy = null;
        next.approvedAt = null;
        if (next.status === "approved") next.status = "ready";
      }
    }
    if (patch.input) {
      next.input = {
        ...next.input,
        ...sanitizeInputPatch(patch.input),
      };
    }
    if (patch.scheduleItems && step.type === "prepare_schedule") {
      next.result = {
        ...next.result,
        scheduleItems: patch.scheduleItems.map((item) => ({
          ...item,
          scheduledPostId: item.scheduledPostId,
        })),
      };
      if (next.status === "needs_review") next.status = "ready";
    }
    return next;
  });
  return { ...plan, steps };
}

function sanitizeInputPatch(input: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key.includes("token") || key.includes("secret")) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      safe[key] = value;
    }
    if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
      safe[key] = value;
    }
  }
  return safe;
}

export function assertPlanStructure(plan: ExecutionPlanJson): void {
  if (plan.version !== 1) throw new Error("Invalid plan version.");
  for (const step of plan.steps) {
    if (!ALLOWED_STEP_TYPES.has(step.type)) {
      throw new Error(`Invalid step type: ${step.type}`);
    }
  }
}
