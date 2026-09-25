import { checkLimit } from "@/lib/billing/entitlements";
import { recordUsageEvent } from "@/lib/billing/service";
import { ensureOperationalScope } from "@/lib/assistant/permissions";
import type { AssistantContext } from "@/lib/assistant/types";
import { applyClientWorkspaceScope } from "@/lib/workspaces/query-scope";
import { insertExecutionPlan } from "@/lib/execution/plan-service";
import { planReviewUrl } from "@/lib/execution/plan-builder";
import { prepareExecutionPlan } from "@/lib/execution/prepare";
import { getRelevantLearnings } from "@/lib/learning/relevance";
import { listEvaluatedStrategies } from "@/lib/evaluation/service";
import { listExperimentIntelligenceSummaries } from "@/lib/experiments/intelligence";
import { formatExperimentEvidenceForStrategist } from "@/lib/experiments/summaries";
import { buildAdaptiveBlock } from "./adaptive";
import { gatherStrategistContext } from "./context";
import { buildEvidenceFromContext } from "./evidence";
import { generateStrategicPlanWithAI } from "./openai";
import { buildExecutionPlanFromStrategicPlan } from "./plan-builder";
import { StrategicPlanValidationError } from "./validation";
import type {
  StrategicAction,
  StrategicAuditEntry,
  StrategicPlanJson,
  StrategicPlanRecord,
  StrategicPlanStatus,
  StrategyType,
  StrategicPlanCreateMeta,
} from "./types";
import { STRATEGIC_PLAN_TTL_DAYS as TTL_DAYS } from "./types";

type PlanRow = {
  id: string;
  organization_id: string;
  client_workspace_id: string | null;
  created_by: string;
  objective: string;
  strategy_type: string;
  status: string;
  plan_json: unknown;
  evidence_json: unknown;
  confidence: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
};

function clientWorkspaceIdForInsert(ctx: AssistantContext): string | null {
  return ctx.isAgency ? ctx.clientWorkspaceId : null;
}

function mapRow(row: PlanRow): StrategicPlanRecord {
  const plan = row.plan_json as StrategicPlanJson;
  const evidence = Array.isArray(row.evidence_json)
    ? (row.evidence_json as StrategicPlanRecord["evidence"])
    : [];
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientWorkspaceId: row.client_workspace_id,
    createdBy: row.created_by,
    objective: row.objective,
    strategyType: row.strategy_type as StrategicPlanRecord["strategyType"],
    status: row.status as StrategicPlanStatus,
    plan:
      plan?.version === 1
        ? plan
        : { version: 1, summary: "", insights: [], actions: [] },
    evidence,
    confidence: row.confidence as StrategicPlanRecord["confidence"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
}

function appendAudit(
  plan: StrategicPlanJson,
  entry: Omit<StrategicAuditEntry, "at">
): StrategicPlanJson {
  const log = plan.auditLog ?? [];
  return {
    ...plan,
    auditLog: [
      ...log,
      { ...entry, at: new Date().toISOString() },
    ].slice(-100),
  };
}

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function assertStrategistAiEntitlement(ctx: AssistantContext): Promise<void> {
  const { count } = await ctx.supabase
    .from("billing_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", ctx.organizationId)
    .eq("metric", "ai_generation")
    .gte("created_at", monthStartIso());

  await checkLimit(
    ctx.supabase,
    ctx.organizationId,
    "ai_generation",
    count ?? 0
  );
}

export function isStrategicPlanExpired(plan: StrategicPlanRecord): boolean {
  if (plan.status === "expired") return true;
  if (!plan.expiresAt) return false;
  return new Date(plan.expiresAt).getTime() < Date.now();
}

export async function getStrategicPlan(
  ctx: AssistantContext,
  planId: string
): Promise<StrategicPlanRecord | null> {
  const { data, error } = await applyClientWorkspaceScope(
    ctx.supabase
      .from("ai_strategic_plans")
      .select("*")
      .eq("id", planId)
      .eq("organization_id", ctx.organizationId),
    ctx.scope
  ).maybeSingle();

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return null;
    throw new Error(error.message);
  }
  return data ? mapRow(data as PlanRow) : null;
}

export async function createStrategicPlan(
  ctx: AssistantContext,
  input: {
    objective: string;
    strategyType?: StrategyType;
    growthBriefId?: string;
    instructions?: string;
    includeAlternatives?: boolean;
  }
): Promise<{ plan: StrategicPlanRecord; meta: StrategicPlanCreateMeta }> {
  ensureOperationalScope(ctx.scope);
  const objective = input.objective.trim();
  if (!objective) {
    throw new StrategicPlanValidationError("objective is required.");
  }

  await assertStrategistAiEntitlement(ctx);

  const relevantLearnings = await getRelevantLearnings(ctx, {
    objective,
    strategyType: input.strategyType,
    limit: 8,
  });

  const evaluatedStrategies = await listEvaluatedStrategies(ctx, 8);
  const experimentSummaries = await listExperimentIntelligenceSummaries(ctx, 5);
  const experimentEvidencePrompt = formatExperimentEvidenceForStrategist(experimentSummaries);
  const { listExperimentEvaluationDocuments } = await import(
    "@/lib/evaluation/experiment-run"
  );
  const { formatExperimentEvaluationsForStrategist } = await import(
    "@/lib/evaluation/context"
  );
  const experimentEvaluations = await listExperimentEvaluationDocuments(ctx, 5);
  const experimentEvaluationsPrompt =
    formatExperimentEvaluationsForStrategist(experimentEvaluations);

  const { getCrossExperimentEvidence } = await import("@/lib/evidence/patterns");
  const { getCrossExperimentLearnings } = await import("@/lib/evidence/learnings");
  const {
    formatCrossExperimentEvidenceForStrategist,
    formatCrossExperimentLearningsForStrategist,
  } = await import("@/lib/evidence/format");
  const crossEvidence = await getCrossExperimentEvidence(ctx, { limit: 20 });
  const crossLearnings = await getCrossExperimentLearnings(ctx, { limit: 20 });
  const crossExperimentEvidencePrompt =
    formatCrossExperimentEvidenceForStrategist(crossEvidence);
  const crossExperimentLearningsPrompt =
    formatCrossExperimentLearningsForStrategist(crossLearnings);

  const { listOptimizationProposals } = await import("@/lib/optimization/service");
  const optimizationProposals = await listOptimizationProposals(ctx, 8);
  const optimizationExecutionNotes = optimizationProposals
    .filter((p) => ["executed", "approved", "rolled_back"].includes(p.status))
    .map((p) => {
      if (p.status === "executed") {
        const pendingOutcome =
          !p.outcome || p.outcome.status === "pending";
        if (!pendingOutcome) return null;
        return `EXECUTED OPTIMIZATION (awaiting measurement): proposal ${p.id} · experiment ${p.sourceId} · ${p.execution?.message ?? "pending"}`;
      }
      if (p.status === "rolled_back") {
        return `ROLLED BACK OPTIMIZATION: proposal ${p.id} · experiment ${p.sourceId}`;
      }
      return `APPROVED OPTIMIZATION (not executed): proposal ${p.id}`;
    })
    .filter(Boolean)
    .join("\n");

  const {
    listOptimizationOutcomes,
    formatOptimizationOutcomesForStrategist,
  } = await import("@/lib/optimization/outcome");
  const optimizationOutcomes = await listOptimizationOutcomes(ctx, { limit: 12 });
  const optimizationOutcomesPrompt = formatOptimizationOutcomesForStrategist(
    optimizationOutcomes.filter((o) => o.status !== "pending")
  );
  const experimentEvidenceWithOptimization = optimizationExecutionNotes
    ? `${experimentEvidencePrompt}\n\n${optimizationExecutionNotes}`
    : experimentEvidencePrompt;

  const bundle = await gatherStrategistContext(ctx, {
    growthBriefId: input.growthBriefId,
    relevantLearnings,
    evaluatedStrategies,
    experimentEvidencePrompt: experimentEvidenceWithOptimization,
    experimentEvaluationsPrompt,
    crossExperimentEvidencePrompt,
    crossExperimentLearningsPrompt,
    optimizationOutcomesPrompt,
  });

  const validated = await generateStrategicPlanWithAI(bundle, {
    objective,
    strategyType: input.strategyType,
    instructions: input.instructions,
    includeAlternatives: input.includeAlternatives,
  });

  const { listOptimizationOpportunities } = await import("@/lib/optimization/strategist");
  const optimizationOpportunities = await listOptimizationOpportunities(ctx);

  const baselineEvidence = buildEvidenceFromContext(bundle);
  const mergedEvidence = validated.evidence.length
    ? validated.evidence
    : baselineEvidence;

  const adaptive = buildAdaptiveBlock(validated, relevantLearnings);

  const planJson: StrategicPlanJson = {
    version: 1,
    summary: validated.summary,
    insights: validated.insights,
    actions: validated.actions,
    alternatives: validated.alternatives,
    adaptive,
    optimizationOpportunities,
    growthBriefId: input.growthBriefId ?? null,
    auditLog: [
      {
        at: new Date().toISOString(),
        actorId: ctx.user.id,
        action: "generated",
        detail: "Strategic plan generated by AI",
      },
    ],
  };

  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + TTL_DAYS);

  const { data, error } = await ctx.supabase
    .from("ai_strategic_plans")
    .insert({
      organization_id: ctx.organizationId,
      client_workspace_id: clientWorkspaceIdForInsert(ctx),
      created_by: ctx.user.id,
      objective: validated.objective,
      strategy_type: validated.strategyType,
      status: "review",
      plan_json: planJson,
      evidence_json: mergedEvidence,
      confidence: validated.confidence,
      expires_at: expiresAt.toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") {
      throw new Error("Strategic plans table missing. Apply migration 029.");
    }
    throw new Error(error.message);
  }

  await recordUsageEvent(ctx.organizationId, "ai_generation");

  const plan = mapRow(data as PlanRow);
  const meta: StrategicPlanCreateMeta = {
    learningCount: adaptive.learningIds.length,
    adaptationCount: adaptive.adaptations.length,
    learningIds: adaptive.learningIds,
  };
  return { plan, meta };
}

export async function updateStrategicPlanActions(
  ctx: AssistantContext,
  planId: string,
  patches: Array<{
    actionId: string;
    reviewStatus?: StrategicAction["reviewStatus"];
    title?: string;
    instructions?: string;
  }>
): Promise<StrategicPlanRecord> {
  const existing = await getStrategicPlan(ctx, planId);
  if (!existing) {
    throw new StrategicPlanValidationError("Plan not found.");
  }
  if (isStrategicPlanExpired(existing)) {
    throw new StrategicPlanValidationError("Plan expired.");
  }
  if (existing.status === "cancelled") {
    throw new StrategicPlanValidationError("Plan cancelled.");
  }

  let planJson = existing.plan;
  const actions = [...planJson.actions];

  for (const patch of patches) {
    const idx = actions.findIndex((a) => a.id === patch.actionId);
    if (idx < 0) continue;
    actions[idx] = {
      ...actions[idx],
      reviewStatus: patch.reviewStatus ?? actions[idx].reviewStatus,
      title: patch.title?.trim() || actions[idx].title,
      instructions:
        patch.instructions !== undefined
          ? patch.instructions
          : actions[idx].instructions,
    };
  }

  planJson = appendAudit(planJson, {
    actorId: ctx.user.id,
    action: "actions_updated",
    detail: `${patches.length} action patch(es)`,
  });
  planJson = { ...planJson, actions };

  const { data, error } = await ctx.supabase
    .from("ai_strategic_plans")
    .update({
      plan_json: planJson,
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId)
    .eq("organization_id", ctx.organizationId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as PlanRow);
}

export async function prepareStrategicPlanExecution(
  ctx: AssistantContext,
  planId: string
): Promise<{
  strategicPlan: StrategicPlanRecord;
  executionPlanId: string;
  reviewUrl: string;
  preparationErrors: string[];
}> {
  ensureOperationalScope(ctx.scope);

  const strategic = await getStrategicPlan(ctx, planId);
  if (!strategic) {
    throw new StrategicPlanValidationError("Plan not found.");
  }
  if (isStrategicPlanExpired(strategic)) {
    throw new StrategicPlanValidationError("Plan expired.");
  }
  if (strategic.status === "cancelled") {
    throw new StrategicPlanValidationError("Plan cancelled.");
  }
  if (strategic.plan.executionPlanId) {
    return {
      strategicPlan: strategic,
      executionPlanId: strategic.plan.executionPlanId,
      reviewUrl: planReviewUrl(strategic.plan.executionPlanId),
      preparationErrors: [],
    };
  }

  const approved = strategic.plan.actions.filter(
    (a) => a.reviewStatus === "approved"
  );
  if (!approved.length) {
    throw new StrategicPlanValidationError(
      "Approve at least one action before preparing execution."
    );
  }

  const built = await buildExecutionPlanFromStrategicPlan(ctx, strategic, approved);
  const executionPlan = await insertExecutionPlan(ctx, {
    title: built.title,
    objective: built.objective,
    growthBriefId: strategic.plan.growthBriefId ?? null,
    plan: built.plan,
    status: "draft",
  });

  const { errors } = await prepareExecutionPlan(ctx, executionPlan.id);

  let planJson = appendAudit(strategic.plan, {
    actorId: ctx.user.id,
    action: "execution_plan_created",
    detail: executionPlan.id,
  });
  planJson = { ...planJson, executionPlanId: executionPlan.id };

  const { data, error } = await ctx.supabase
    .from("ai_strategic_plans")
    .update({
      plan_json: planJson,
      status: "prepared",
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId)
    .eq("organization_id", ctx.organizationId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return {
    strategicPlan: mapRow(data as PlanRow),
    executionPlanId: executionPlan.id,
    reviewUrl: planReviewUrl(executionPlan.id),
    preparationErrors: errors,
  };
}

export async function cancelStrategicPlan(
  ctx: AssistantContext,
  planId: string
): Promise<StrategicPlanRecord> {
  const existing = await getStrategicPlan(ctx, planId);
  if (!existing) {
    throw new StrategicPlanValidationError("Plan not found.");
  }

  const planJson = appendAudit(existing.plan, {
    actorId: ctx.user.id,
    action: "cancelled",
    detail: "User cancelled strategic plan",
  });

  const { data, error } = await ctx.supabase
    .from("ai_strategic_plans")
    .update({
      status: "cancelled",
      plan_json: planJson,
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId)
    .eq("organization_id", ctx.organizationId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as PlanRow);
}

export { StrategicPlanValidationError, validateStrategicPlanOutput } from "./validation";
