import { checkLimit } from "@/lib/billing/entitlements";
import { recordUsageEvent } from "@/lib/billing/service";
import { getCompactBrandPrompt } from "@/lib/assistant/brand-brain/loader";
import type { AssistantContext } from "@/lib/assistant/types";
import { applyClientWorkspaceScope } from "@/lib/workspaces/query-scope";
import { compareSnapshots } from "./compare";
import { deriveLearningConfidence } from "./learning";
import { captureOutcomeSnapshot, outcomeWindowElapsed } from "./measure";
import { interpretOutcomeWithAI } from "./openai";
import type {
  ComparisonJson,
  LearningAuditEntry,
  LearningConfidence,
  LearningInterpretationJson,
  LearningOutcomeRecord,
  LearningOutcomeStatus,
  LearningSourceType,
  MetricSnapshot,
} from "./types";

type OutcomeRow = {
  id: string;
  organization_id: string;
  client_workspace_id: string | null;
  strategic_plan_id: string | null;
  execution_plan_id: string | null;
  execution_step_id: string | null;
  source_type: string;
  source_id: string | null;
  platform: string | null;
  content_id: string | null;
  campaign_id: string | null;
  scheduled_post_id: string | null;
  objective: string;
  idempotency_key: string;
  baseline_json: unknown;
  outcome_json: unknown;
  comparison_json: unknown;
  learning_json: unknown;
  confidence: string;
  status: string;
  measure_after: string;
  measured_at: string | null;
  created_at: string;
  updated_at: string;
};

function emptySnapshot(): MetricSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    windowDays: 7,
    impressions: null,
    reach: null,
    engagement: null,
    likes: null,
    comments: null,
    shares: null,
    saves: null,
    views: null,
    postsPublished: null,
    publishingFrequencyPerWeek: null,
    campaignActiveCount: null,
  };
}

function mapRow(row: OutcomeRow): LearningOutcomeRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientWorkspaceId: row.client_workspace_id,
    strategicPlanId: row.strategic_plan_id,
    executionPlanId: row.execution_plan_id,
    executionStepId: row.execution_step_id,
    sourceType: row.source_type as LearningSourceType,
    sourceId: row.source_id,
    platform: row.platform,
    contentId: row.content_id,
    campaignId: row.campaign_id,
    scheduledPostId: row.scheduled_post_id,
    objective: row.objective,
    idempotencyKey: row.idempotency_key,
    baseline: (row.baseline_json as MetricSnapshot) ?? emptySnapshot(),
    outcome: (row.outcome_json as MetricSnapshot) ?? emptySnapshot(),
    comparison: (row.comparison_json as ComparisonJson) ?? {
      version: 1,
      rows: [],
      overallAvailability: "unavailable",
    },
    learning: (row.learning_json as LearningInterpretationJson) ?? {},
    confidence: row.confidence as LearningConfidence,
    status: row.status as LearningOutcomeStatus,
    measureAfter: row.measure_after,
    measuredAt: row.measured_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function clientWorkspaceIdForInsert(ctx: AssistantContext): string | null {
  return ctx.isAgency ? ctx.clientWorkspaceId : null;
}

function appendAudit(
  learning: LearningInterpretationJson | Record<string, never>,
  entry: Omit<LearningAuditEntry, "at">
): LearningInterpretationJson | Record<string, unknown> {
  const base =
    learning && typeof learning === "object" && "version" in learning
      ? (learning as LearningInterpretationJson)
      : { version: 1 as const, summary: "", whatWorked: [], whatDidNotWork: [], observations: [], learnings: [], confidence: "low" as const, nextConsiderations: [] };
  const log = (base as { auditLog?: LearningAuditEntry[] }).auditLog ?? [];
  return {
    ...base,
    auditLog: [...log, { ...entry, at: new Date().toISOString() }].slice(-50),
  };
}

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function assertLearningAiEntitlement(ctx: AssistantContext): Promise<void> {
  const { count } = await ctx.supabase
    .from("billing_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", ctx.organizationId)
    .eq("metric", "ai_generation")
    .gte("created_at", monthStartIso());
  await checkLimit(ctx.supabase, ctx.organizationId, "ai_generation", count ?? 0);
}

export async function insertLearningOutcome(
  ctx: AssistantContext,
  input: {
    idempotencyKey: string;
    objective: string;
    sourceType: LearningSourceType;
    sourceId?: string | null;
    strategicPlanId?: string | null;
    executionPlanId?: string | null;
    executionStepId?: string | null;
    platform?: string | null;
    contentId?: string | null;
    campaignId?: string | null;
    scheduledPostId?: string | null;
    baseline: MetricSnapshot;
    windowDays: number;
    status?: LearningOutcomeStatus;
    experimentId?: string | null;
    experimentVariantId?: string | null;
  }
): Promise<LearningOutcomeRecord | null> {
  const measureAfter = new Date();
  measureAfter.setUTCDate(measureAfter.getUTCDate() + input.windowDays);

  const { data, error } = await ctx.supabase
    .from("ai_learning_outcomes")
    .insert({
      organization_id: ctx.organizationId,
      client_workspace_id: clientWorkspaceIdForInsert(ctx),
      strategic_plan_id: input.strategicPlanId ?? null,
      execution_plan_id: input.executionPlanId ?? null,
      execution_step_id: input.executionStepId ?? null,
      source_type: input.sourceType,
      source_id: input.sourceId ?? null,
      platform: input.platform ?? null,
      content_id: input.contentId ?? null,
      campaign_id: input.campaignId ?? null,
      scheduled_post_id: input.scheduledPostId ?? null,
      experiment_id: input.experimentId ?? null,
      experiment_variant_id: input.experimentVariantId ?? null,
      objective: input.objective,
      idempotency_key: input.idempotencyKey,
      baseline_json: input.baseline,
      outcome_json: emptySnapshot(),
      comparison_json: { version: 1, rows: [], overallAvailability: "unavailable" },
      learning_json: appendAudit({}, {
        action: "baseline_captured",
        detail: `Measure after ${input.windowDays}d`,
      }),
      confidence: "low",
      status: input.status ?? "pending",
      measure_after: measureAfter.toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") return null;
    if (error.code === "42P01" || error.code === "PGRST205") {
      throw new Error("Learning outcomes table missing. Apply migration 030.");
    }
    throw new Error(error.message);
  }
  return mapRow(data as OutcomeRow);
}

export async function getLearningOutcome(
  ctx: AssistantContext,
  id: string
): Promise<LearningOutcomeRecord | null> {
  const { data, error } = await applyClientWorkspaceScope(
    ctx.supabase
      .from("ai_learning_outcomes")
      .select("*")
      .eq("id", id)
      .eq("organization_id", ctx.organizationId),
    ctx.scope
  ).maybeSingle();

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return null;
    throw new Error(error.message);
  }
  return data ? mapRow(data as OutcomeRow) : null;
}

export async function listLearningOutcomes(
  ctx: AssistantContext,
  options?: { limit?: number; status?: LearningOutcomeStatus }
): Promise<LearningOutcomeRecord[]> {
  let query = applyClientWorkspaceScope(
    ctx.supabase
      .from("ai_learning_outcomes")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: false })
      .limit(options?.limit ?? 20),
    ctx.scope
  );
  if (options?.status) query = query.eq("status", options.status);

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => mapRow(row as OutcomeRow));
}

export async function listMeasuredLearnings(
  ctx: AssistantContext,
  options?: { limit?: number; platform?: string | null }
): Promise<LearningOutcomeRecord[]> {
  let query = applyClientWorkspaceScope(
    ctx.supabase
      .from("ai_learning_outcomes")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .eq("status", "measured")
      .order("measured_at", { ascending: false })
      .limit(options?.limit ?? 10),
    ctx.scope
  );
  if (options?.platform) query = query.eq("platform", options.platform);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((row) => mapRow(row as OutcomeRow));
}

export async function listOutcomesForExecutionPlan(
  ctx: AssistantContext,
  executionPlanId: string
): Promise<LearningOutcomeRecord[]> {
  const { data, error } = await applyClientWorkspaceScope(
    ctx.supabase
      .from("ai_learning_outcomes")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .eq("execution_plan_id", executionPlanId)
      .order("created_at", { ascending: false }),
    ctx.scope
  );
  if (error) return [];
  return (data ?? []).map((row) => mapRow(row as OutcomeRow));
}

export async function measureLearningOutcome(
  ctx: AssistantContext,
  recordId: string,
  options?: { skipWindowCheck?: boolean; interpret?: boolean }
): Promise<LearningOutcomeRecord> {
  const existing = await getLearningOutcome(ctx, recordId);
  if (!existing) throw new Error("Learning outcome not found.");
  if (existing.status === "measured" && options?.interpret !== true) {
    return existing;
  }
  if (!outcomeWindowElapsed(existing) && !options?.skipWindowCheck) {
    throw new Error("Outcome window has not elapsed yet.");
  }

  await ctx.supabase
    .from("ai_learning_outcomes")
    .update({ status: "measuring", updated_at: new Date().toISOString() })
    .eq("id", recordId)
    .eq("organization_id", ctx.organizationId);

  const outcome = await captureOutcomeSnapshot(ctx, existing);
  const comparison = compareSnapshots(existing.baseline, outcome);
  const confidence = deriveLearningConfidence(comparison, existing.baseline, outcome);

  let status: LearningOutcomeStatus = "measured";
  if (comparison.overallAvailability === "unavailable") {
    status = "insufficient_data";
  }

  let learningJson: LearningInterpretationJson | Record<string, unknown> = appendAudit(
    existing.learning as LearningInterpretationJson,
    { action: "outcome_measured", detail: status }
  );

  if (status === "measured" && options?.interpret !== false) {
    try {
      await assertLearningAiEntitlement(ctx);
      const brandBrain = await getCompactBrandPrompt(ctx, { mode: "strategy" });
      const interpreted = await interpretOutcomeWithAI({
        objective: existing.objective,
        brandBrain,
        baseline: existing.baseline,
        outcome,
        comparison,
      });
      learningJson = appendAudit(interpreted, {
        action: "ai_interpreted",
        detail: interpreted.confidence,
      });
      await recordUsageEvent(ctx.organizationId, "ai_generation");
    } catch {
      learningJson = appendAudit(learningJson as LearningInterpretationJson, {
        action: "ai_interpretation_skipped",
        detail: "Entitlement or OpenAI unavailable",
      });
    }
  }

  const { data, error } = await ctx.supabase
    .from("ai_learning_outcomes")
    .update({
      outcome_json: outcome,
      comparison_json: comparison,
      learning_json: learningJson,
      confidence,
      status,
      measured_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", recordId)
    .eq("organization_id", ctx.organizationId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as OutcomeRow);
}
