import { checkLimit } from "@/lib/billing/entitlements";
import { recordUsageEvent } from "@/lib/billing/service";
import type { AssistantContext } from "@/lib/assistant/types";
import { applyClientWorkspaceScope } from "@/lib/workspaces/query-scope";
import { getStrategicPlan } from "@/lib/strategist/service";
import { formatLearningsForPrompt } from "@/lib/learning/context";
import { listMeasuredLearnings } from "@/lib/learning/service";
import type { ComparisonJson, MetricSnapshot } from "@/lib/learning/types";
import { captureEvaluationBaseline, captureEvaluationOutcome } from "./baseline";
import { buildAttribution, classifyResult } from "./attribution";
import { compareForObjective } from "./compare";
import { strategyTypeToObjective } from "./context";
import { evaluationWindowElapsed } from "./measure";
import { interpretEvaluationWithAI } from "./openai";
import type {
  AttributionJson,
  EvaluationConfidence,
  EvaluationInterpretationJson,
  EvaluationStatus,
  StrategyEvaluationRecord,
  StrategyObjectiveKind,
} from "./types";
import { experimentEvaluationIdempotencyKey } from "./experiment";
import { EVALUATION_WINDOW_DAYS as WINDOW_DAYS } from "./types";

type EvalRow = {
  id: string;
  organization_id: string;
  client_workspace_id: string | null;
  strategic_plan_id: string;
  execution_plan_id: string | null;
  objective: string;
  idempotency_key: string;
  evaluation_status: string;
  baseline_json: unknown;
  outcome_json: unknown;
  comparison_json: unknown;
  attribution_json: unknown;
  evaluation_json: unknown;
  confidence: string;
  experiment_id: string | null;
  variant_id: string | null;
  experiment_label: string | null;
  measure_after: string;
  measured_at: string | null;
  created_at: string;
  updated_at: string;
};

function emptySnapshot(): MetricSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    windowDays: WINDOW_DAYS,
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

function mapRow(row: EvalRow): StrategyEvaluationRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientWorkspaceId: row.client_workspace_id,
    strategicPlanId: row.strategic_plan_id,
    executionPlanId: row.execution_plan_id,
    objective: row.objective as StrategyObjectiveKind,
    idempotencyKey: row.idempotency_key,
    status: row.evaluation_status as EvaluationStatus,
    baseline: (row.baseline_json as MetricSnapshot) ?? emptySnapshot(),
    outcome: (row.outcome_json as MetricSnapshot) ?? emptySnapshot(),
    comparison: (row.comparison_json as ComparisonJson) ?? {
      version: 1,
      rows: [],
      overallAvailability: "unavailable",
    },
    attribution: (row.attribution_json as AttributionJson) ?? {
      version: 1,
      level: "insufficient_evidence",
      evidence: [],
      limitations: [],
    },
    evaluation: (row.evaluation_json as EvaluationInterpretationJson) ?? {},
    confidence: row.confidence as EvaluationConfidence,
    experimentId: row.experiment_id,
    variantId: row.variant_id,
    experimentLabel: row.experiment_label,
    measureAfter: row.measure_after,
    measuredAt: row.measured_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function clientWorkspaceIdForInsert(ctx: AssistantContext): string | null {
  return ctx.isAgency ? ctx.clientWorkspaceId : null;
}

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function assertEvaluationAiEntitlement(ctx: AssistantContext): Promise<void> {
  const { count } = await ctx.supabase
    .from("billing_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", ctx.organizationId)
    .eq("metric", "ai_generation")
    .gte("created_at", monthStartIso());
  await checkLimit(ctx.supabase, ctx.organizationId, "ai_generation", count ?? 0);
}

export async function queueStrategyEvaluation(
  ctx: AssistantContext,
  input: {
    strategicPlanId: string;
    executionPlanId: string | null;
    objective?: StrategyObjectiveKind;
    experimentId?: string | null;
    variantId?: string | null;
    experimentLabel?: string | null;
  }
): Promise<StrategyEvaluationRecord | null> {
  const strategic = await getStrategicPlan(ctx, input.strategicPlanId);
  if (!strategic) return null;

  const objective =
    input.objective ?? strategyTypeToObjective(strategic.strategyType);
  const idempotencyKey = input.experimentId
    ? experimentEvaluationIdempotencyKey(input.experimentId)
    : `${input.strategicPlanId}:${input.executionPlanId ?? "no-exec"}`;

  const baseline = await captureEvaluationBaseline(ctx, input.executionPlanId);
  const measureAfter = new Date();
  measureAfter.setUTCDate(measureAfter.getUTCDate() + WINDOW_DAYS);

  const { data, error } = await ctx.supabase
    .from("ai_strategy_evaluations")
    .insert({
      organization_id: ctx.organizationId,
      client_workspace_id: clientWorkspaceIdForInsert(ctx),
      strategic_plan_id: input.strategicPlanId,
      execution_plan_id: input.executionPlanId,
      objective,
      idempotency_key: idempotencyKey,
      evaluation_status: "pending",
      baseline_json: baseline,
      outcome_json: emptySnapshot(),
      comparison_json: { version: 1, rows: [], overallAvailability: "unavailable" },
      attribution_json: { version: 1, level: "insufficient_evidence", evidence: [], limitations: [] },
      evaluation_json: {},
      confidence: "low",
      experiment_id: input.experimentId ?? null,
      variant_id: input.variantId ?? null,
      experiment_label: input.experimentLabel ?? null,
      measure_after: measureAfter.toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await ctx.supabase
        .from("ai_strategy_evaluations")
        .select("*")
        .eq("organization_id", ctx.organizationId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      return existing ? mapRow(existing as EvalRow) : null;
    }
    if (error.code === "42P01" || error.code === "PGRST205") {
      throw new Error("Strategy evaluations table missing. Apply migration 031.");
    }
    throw new Error(error.message);
  }
  return mapRow(data as EvalRow);
}

export async function getStrategyEvaluation(
  ctx: AssistantContext,
  id: string
): Promise<StrategyEvaluationRecord | null> {
  const { data, error } = await applyClientWorkspaceScope(
    ctx.supabase
      .from("ai_strategy_evaluations")
      .select("*")
      .eq("id", id)
      .eq("organization_id", ctx.organizationId),
    ctx.scope
  ).maybeSingle();

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return null;
    throw new Error(error.message);
  }
  return data ? mapRow(data as EvalRow) : null;
}

export async function getEvaluationForExecutionPlan(
  ctx: AssistantContext,
  executionPlanId: string
): Promise<StrategyEvaluationRecord | null> {
  const { data, error } = await applyClientWorkspaceScope(
    ctx.supabase
      .from("ai_strategy_evaluations")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .eq("execution_plan_id", executionPlanId)
      .order("created_at", { ascending: false })
      .limit(1),
    ctx.scope
  ).maybeSingle();

  if (error) return null;
  return data ? mapRow(data as EvalRow) : null;
}

export async function getEvaluationForStrategicPlan(
  ctx: AssistantContext,
  strategicPlanId: string
): Promise<StrategyEvaluationRecord | null> {
  const { data, error } = await applyClientWorkspaceScope(
    ctx.supabase
      .from("ai_strategy_evaluations")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .eq("strategic_plan_id", strategicPlanId)
      .order("created_at", { ascending: false })
      .limit(1),
    ctx.scope
  ).maybeSingle();

  if (error) return null;
  return data ? mapRow(data as EvalRow) : null;
}

export async function listEvaluatedStrategies(
  ctx: AssistantContext,
  limit = 10
): Promise<StrategyEvaluationRecord[]> {
  const { data, error } = await applyClientWorkspaceScope(
    ctx.supabase
      .from("ai_strategy_evaluations")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .eq("evaluation_status", "evaluated")
      .order("measured_at", { ascending: false })
      .limit(limit),
    ctx.scope
  );
  if (error) return [];
  return (data ?? []).map((row) => mapRow(row as EvalRow));
}

export async function runStrategyEvaluation(
  ctx: AssistantContext,
  evaluationId: string,
  options?: { skipWindowCheck?: boolean; interpret?: boolean }
): Promise<StrategyEvaluationRecord> {
  const existing = await getStrategyEvaluation(ctx, evaluationId);
  if (!existing) throw new Error("Evaluation not found.");
  if (existing.status === "evaluated" && options?.interpret !== true) {
    return existing;
  }

  if (existing.experimentId) {
    const { runExperimentEvaluation } = await import("./experiment-run");
    const { hasUsableMeasurementSnapshot } = await import("./experiment");
    const { getExperiment } = await import("@/lib/experiments/service");
    const linked = await getExperiment(ctx, existing.experimentId);
    if (linked && hasUsableMeasurementSnapshot(linked.measurementSnapshot)) {
      await runExperimentEvaluation(ctx, existing.experimentId, {
        interpret: options?.interpret !== false,
        force: options?.interpret === true,
      });
      const refreshed = await getStrategyEvaluation(ctx, evaluationId);
      if (refreshed) return refreshed;
    }
  }

  if (!evaluationWindowElapsed(existing) && !options?.skipWindowCheck) {
    throw new Error("Evaluation window has not elapsed yet.");
  }

  await ctx.supabase
    .from("ai_strategy_evaluations")
    .update({ evaluation_status: "measuring", updated_at: new Date().toISOString() })
    .eq("id", evaluationId);

  const strategic = await getStrategicPlan(ctx, existing.strategicPlanId);
  const outcome = await captureEvaluationOutcome(ctx, existing.executionPlanId);
  const comparison = compareForObjective(
    existing.baseline,
    outcome,
    existing.objective
  );
  let attribution = buildAttribution(
    comparison,
    existing.executionPlanId,
    strategic?.plan.adaptive?.mixedEvidenceNote
  );

  const classification = classifyResult(comparison, existing.objective);

  let status: EvaluationStatus = "evaluated";
  if (classification === "insufficient_data") status = "insufficient_data";
  if (classification === "inconclusive") status = "inconclusive";
  if (comparison.overallAvailability === "unavailable") status = "insufficient_data";

  let evaluationJson: EvaluationInterpretationJson | Record<string, never> = {
    version: 1,
    summary: "Deterministic evaluation complete.",
    objectiveResult: classification,
    resultClassification: classification,
    whatWorked: [],
    whatUnderperformed: [],
    unexpectedResults: [],
    limitations: attribution.limitations,
    confidence: "low",
    futureConsiderations: [],
  };

  let confidence: EvaluationConfidence = "low";

  if (status === "evaluated" && options?.interpret !== false) {
    try {
      await assertEvaluationAiEntitlement(ctx);
      const learnings = await listMeasuredLearnings(ctx, { limit: 5 });
      const interpreted = await interpretEvaluationWithAI({
        objective: existing.objective,
        strategySummary: strategic?.plan.summary ?? strategic?.objective ?? "",
        strategicEvidence: strategic?.evidence ?? [],
        baseline: existing.baseline,
        outcome,
        comparison,
        attribution,
        learningsSummary: formatLearningsForPrompt(learnings),
      });
      evaluationJson = interpreted;
      confidence = interpreted.confidence;
      await recordUsageEvent(ctx.organizationId, "ai_generation");
    } catch {
      evaluationJson = {
        ...evaluationJson,
        limitations: [
          ...attribution.limitations,
          "AI interpretation skipped (entitlement or configuration).",
        ],
      };
    }
  }

  const { data, error } = await ctx.supabase
    .from("ai_strategy_evaluations")
    .update({
      outcome_json: outcome,
      comparison_json: comparison,
      attribution_json: attribution,
      evaluation_json: evaluationJson,
      evaluation_status: status,
      confidence,
      measured_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", evaluationId)
    .eq("organization_id", ctx.organizationId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as EvalRow);
}

export function mapStrategyEvaluationRow(row: EvalRow): StrategyEvaluationRecord {
  return mapRow(row);
}
