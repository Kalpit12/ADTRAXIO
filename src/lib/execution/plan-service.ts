import { randomUUID } from "crypto";
import { applyClientWorkspaceScope } from "@/lib/workspaces/query-scope";
import type { AssistantContext } from "@/lib/assistant/types";
import type {
  ExecutionPlanJson,
  ExecutionPlanRecord,
  ExecutionPlanStatus,
  ExecutionPlanStep,
} from "./types";

export type { ExecutionPlanStatus };
import { PLAN_TTL_DAYS } from "./types";

type PlanRow = {
  id: string;
  organization_id: string;
  client_workspace_id: string | null;
  created_by: string;
  growth_brief_id: string | null;
  title: string;
  objective: string;
  status: string;
  plan_json: unknown;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
};

function mapPlan(row: PlanRow): ExecutionPlanRecord {
  const plan = row.plan_json as ExecutionPlanJson;
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientWorkspaceId: row.client_workspace_id,
    createdBy: row.created_by,
    growthBriefId: row.growth_brief_id,
    title: row.title,
    objective: row.objective,
    status: row.status as ExecutionPlanStatus,
    plan: plan?.version === 1 ? plan : { version: 1, rationale: "", evidence: [], steps: [] },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
}

function clientWorkspaceIdForInsert(ctx: AssistantContext): string | null {
  return ctx.isAgency ? ctx.clientWorkspaceId : null;
}

export function newStep(
  partial: Omit<ExecutionPlanStep, "id" | "status" | "approved"> & {
    status?: ExecutionPlanStep["status"];
    approved?: boolean;
  }
): ExecutionPlanStep {
  return {
    id: randomUUID(),
    status: partial.status ?? "pending",
    approved: partial.approved ?? false,
    ...partial,
  };
}

export async function getExecutionPlan(
  ctx: AssistantContext,
  planId: string
): Promise<ExecutionPlanRecord | null> {
  const { data, error } = await applyClientWorkspaceScope(
    ctx.supabase
      .from("ai_execution_plans")
      .select("*")
      .eq("id", planId)
      .eq("organization_id", ctx.organizationId),
    ctx.scope
  ).maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    throw new Error(error.message);
  }
  return data ? mapPlan(data as PlanRow) : null;
}

export async function insertExecutionPlan(
  ctx: AssistantContext,
  input: {
    title: string;
    objective: string;
    growthBriefId?: string | null;
    plan: ExecutionPlanJson;
    status?: ExecutionPlanStatus;
  }
): Promise<ExecutionPlanRecord> {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + PLAN_TTL_DAYS);

  const { data, error } = await ctx.supabase
    .from("ai_execution_plans")
    .insert({
      organization_id: ctx.organizationId,
      client_workspace_id: clientWorkspaceIdForInsert(ctx),
      created_by: ctx.user.id,
      growth_brief_id: input.growthBriefId ?? null,
      title: input.title,
      objective: input.objective,
      status: input.status ?? "draft",
      plan_json: input.plan,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "42P01") {
      throw new Error("Execution plans are not available. Run migration 028.");
    }
    throw new Error(error.message);
  }

  return mapPlan(data as PlanRow);
}

export async function updateExecutionPlan(
  ctx: AssistantContext,
  planId: string,
  input: {
    status?: ExecutionPlanStatus;
    plan?: ExecutionPlanJson;
  }
): Promise<ExecutionPlanRecord | null> {
  const existing = await getExecutionPlan(ctx, planId);
  if (!existing) return null;

  const { data, error } = await ctx.supabase
    .from("ai_execution_plans")
    .update({
      status: input.status ?? existing.status,
      plan_json: input.plan ?? existing.plan,
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId)
    .eq("organization_id", ctx.organizationId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapPlan(data as PlanRow);
}

export function isPlanExpired(plan: ExecutionPlanRecord): boolean {
  if (!plan.expiresAt) return false;
  return new Date(plan.expiresAt) < new Date();
}

const EXECUTION_LOCK_MS = 2 * 60 * 1000;

export async function claimExecutionLock(
  ctx: AssistantContext,
  planId: string
): Promise<
  | { ok: true; plan: ExecutionPlanRecord }
  | { ok: false; error: string; plan?: ExecutionPlanRecord }
> {
  const plan = await getExecutionPlan(ctx, planId);
  if (!plan) return { ok: false, error: "Plan not found." };

  if (plan.status === "executing") {
    const age = Date.now() - new Date(plan.updatedAt).getTime();
    if (age < EXECUTION_LOCK_MS) {
      return {
        ok: false,
        error: "Execution already in progress. Wait or retry shortly.",
        plan,
      };
    }
  }

  const allowed = new Set([
    "review",
    "approved",
    "partially_completed",
    "failed",
    "executing",
  ]);
  if (!allowed.has(plan.status)) {
    return {
      ok: false,
      error: `Cannot execute while plan status is ${plan.status}.`,
      plan,
    };
  }

  const updated = await updateExecutionPlan(ctx, planId, { status: "executing" });
  if (!updated) return { ok: false, error: "Unable to lock plan." };
  return { ok: true, plan: updated };
}

export function releaseExecutionLockStatus(
  plan: ExecutionPlanRecord,
  results: Array<{ success: boolean }>
): ExecutionPlanStatus {
  const failures = results.filter((r) => !r.success).length;
  const successes = results.filter((r) => r.success).length;
  if (successes > 0 && failures === 0) return "completed";
  if (successes > 0 && failures > 0) return "partially_completed";
  if (failures > 0) return "failed";
  return plan.status === "executing" ? "review" : plan.status;
}
