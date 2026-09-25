import { recordUsageEvent } from "@/lib/billing/service";
import type { AssistantContext } from "@/lib/assistant/types";
import { gateExperimentLearning } from "@/lib/experiments/learning-quality";
import { getExperiment } from "@/lib/experiments/service";
import type { ExperimentRecord } from "@/lib/experiments/types";
import { getStrategicPlan } from "@/lib/strategist/service";
import { strategyTypeToObjective } from "./context";
import {
  attributionFromMeasurementSnapshot,
  buildDeterministicExperimentInterpretation,
  buildNormalizedExperimentEvaluation,
  experimentEvaluationIdempotencyKey,
  hasUsableMeasurementSnapshot,
  variantComparisonFromMeasurementSnapshot,
  variantComparisonToComparisonJson,
  type ExperimentEvaluationDocument,
  type NormalizedExperimentEvaluation,
} from "./experiment";
import { interpretExperimentEvaluationWithAI } from "./openai";
import { assertEvaluationAiEntitlement, queueStrategyEvaluation } from "./service";
import type { EvaluationStatus } from "./types";

function isExperimentEvaluationDocument(
  raw: ExperimentRecord["experimentEvaluation"]
): ExperimentEvaluationDocument | null {
  if (!raw || typeof raw !== "object" || !("normalized" in raw)) return null;
  const doc = raw as ExperimentEvaluationDocument;
  return doc.normalized ? doc : null;
}

export async function getExperimentEvaluationDocument(
  ctx: AssistantContext,
  experimentId: string
): Promise<ExperimentEvaluationDocument | null> {
  const exp = await getExperiment(ctx, experimentId);
  if (!exp) return null;
  return isExperimentEvaluationDocument(exp.experimentEvaluation);
}

export async function listExperimentEvaluationDocuments(
  ctx: AssistantContext,
  limit = 5
): Promise<ExperimentEvaluationDocument[]> {
  const { listExperiments } = await import("@/lib/experiments/service");
  const experiments = await listExperiments(ctx, {
    limit: Math.max(limit * 3, 10),
    status: "completed",
  });
  const docs: ExperimentEvaluationDocument[] = [];
  for (const item of experiments) {
    const full = await getExperiment(ctx, item.id);
    const doc = full ? isExperimentEvaluationDocument(full.experimentEvaluation) : null;
    if (doc) docs.push(doc);
    if (docs.length >= limit) break;
  }
  return docs;
}

async function persistExperimentEvaluationDocument(
  ctx: AssistantContext,
  experimentId: string,
  doc: ExperimentEvaluationDocument
): Promise<void> {
  await ctx.supabase
    .from("ai_experiments")
    .update({
      experiment_evaluation_json: doc,
      updated_at: new Date().toISOString(),
    })
    .eq("id", experimentId)
    .eq("organization_id", ctx.organizationId);
}

async function syncStrategyEvaluationFromSnapshot(
  ctx: AssistantContext,
  experiment: ExperimentRecord,
  normalized: NormalizedExperimentEvaluation,
  doc: ExperimentEvaluationDocument,
  options?: { interpret?: boolean }
): Promise<string | null> {
  if (!experiment.strategicPlanId) return null;

  const strategic = await getStrategicPlan(ctx, experiment.strategicPlanId);
  if (!strategic) return null;

  const snapshot = experiment.measurementSnapshot;
  if (!hasUsableMeasurementSnapshot(snapshot)) return null;

  const comparison = variantComparisonToComparisonJson(
    variantComparisonFromMeasurementSnapshot(snapshot)
  );
  const attribution = attributionFromMeasurementSnapshot(snapshot);

  let evaluationId: string | null = doc.strategyEvaluationId ?? null;
  if (!evaluationId) {
    const queued = await queueStrategyEvaluation(ctx, {
      strategicPlanId: experiment.strategicPlanId,
      executionPlanId: experiment.allocation.executionPlanId ?? null,
      objective: strategyTypeToObjective(strategic.strategyType),
      experimentId: experiment.id,
      experimentLabel: experiment.name,
    });
    evaluationId = queued?.id ?? null;
    if (!evaluationId) {
      const { data } = await ctx.supabase
        .from("ai_strategy_evaluations")
        .select("id")
        .eq("organization_id", ctx.organizationId)
        .eq("idempotency_key", experimentEvaluationIdempotencyKey(experiment.id))
        .maybeSingle();
      evaluationId = data?.id ?? null;
    }
  }

  if (!evaluationId) return null;

  const interpretationPayload = {
    version: 2 as const,
    kind: "experiment" as const,
    normalized,
    interpretation: doc.interpretation,
    strategyEvaluationId: evaluationId,
  };

  let status: EvaluationStatus =
    normalized.lifecycle === "incomplete" ? "insufficient_data" : "evaluated";

  await ctx.supabase
    .from("ai_strategy_evaluations")
    .update({
      comparison_json: comparison,
      attribution_json: attribution,
      evaluation_json: interpretationPayload,
      evaluation_status: status,
      measured_at: normalized.measuredAt,
      measure_after: normalized.measuredAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", evaluationId)
    .eq("organization_id", ctx.organizationId);

  if (status === "evaluated" && options?.interpret !== false && doc.interpretation) {
    await ctx.supabase
      .from("ai_strategy_evaluations")
      .update({
        evaluation_status: "evaluated",
        confidence: "low",
        updated_at: new Date().toISOString(),
      })
      .eq("id", evaluationId);
  }

  return evaluationId;
}

async function applyLearningFromNormalizedEvaluation(
  ctx: AssistantContext,
  experiment: ExperimentRecord,
  normalized: NormalizedExperimentEvaluation
): Promise<void> {
  const snapshot = experiment.measurementSnapshot;
  if (!hasUsableMeasurementSnapshot(snapshot)) return;

  const gate = gateExperimentLearning(snapshot.dataQuality, snapshot.attribution);
  const variants = experiment.variants ?? [];
  for (const v of variants) {
    const { data: learning } = await ctx.supabase
      .from("ai_learning_outcomes")
      .select("id")
      .eq("organization_id", ctx.organizationId)
      .eq("idempotency_key", `experiment:${experiment.id}:variant:${v.id}`)
      .maybeSingle();
    if (!learning?.id) continue;

    const status =
      gate.allowStrongLearning && normalized.lifecycle === "evaluated"
        ? "measured"
        : "insufficient_data";

    await ctx.supabase
      .from("ai_learning_outcomes")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", learning.id);
  }
}

export async function runExperimentEvaluation(
  ctx: AssistantContext,
  experimentId: string,
  options?: { interpret?: boolean; force?: boolean }
): Promise<ExperimentEvaluationDocument | null> {
  const exp = await getExperiment(ctx, experimentId);
  if (!exp) return null;

  const existingDoc = isExperimentEvaluationDocument(exp.experimentEvaluation);
  if (
    existingDoc?.normalized?.snapshotIdempotencyKey &&
    hasUsableMeasurementSnapshot(exp.measurementSnapshot) &&
    existingDoc.normalized.snapshotIdempotencyKey ===
      exp.measurementSnapshot.idempotencyKey &&
    existingDoc.normalized.lifecycle === "interpreted" &&
    !options?.force
  ) {
    return existingDoc;
  }

  if (!hasUsableMeasurementSnapshot(exp.measurementSnapshot)) {
    const incomplete: ExperimentEvaluationDocument = {
      version: 2,
      kind: "experiment",
      normalized: {
        version: 1,
        experimentId: exp.id,
        hypothesis: exp.hypothesis,
        objective: exp.objective,
        primaryMetric: exp.successMetric,
        observationWindowDays: exp.minimumObservationDays,
        measuredAt: new Date().toISOString(),
        variantResults: [],
        higherObservedVariantKey: null,
        dataQualityStatus: "unavailable",
        attributionStatus: "unavailable",
        limitations: ["No measurement snapshot available."],
        snapshotIdempotencyKey: "none",
        lifecycle: "incomplete",
      },
    };
    await persistExperimentEvaluationDocument(ctx, experimentId, incomplete);
    return incomplete;
  }

  const snapshot = exp.measurementSnapshot;
  const normalized = buildNormalizedExperimentEvaluation(exp, snapshot);
  let interpretation = buildDeterministicExperimentInterpretation(normalized);
  let lifecycle = normalized.lifecycle;

  if (lifecycle === "evaluated" && options?.interpret !== false) {
    try {
      await assertEvaluationAiEntitlement(ctx);
      interpretation = await interpretExperimentEvaluationWithAI(normalized);
      lifecycle = "interpreted";
      normalized.lifecycle = "interpreted";
      await recordUsageEvent(ctx.organizationId, "ai_generation");
    } catch {
      /* deterministic interpretation retained */
    }
  }

  const doc: ExperimentEvaluationDocument = {
    version: 2,
    kind: "experiment",
    normalized: { ...normalized, lifecycle },
    interpretation,
    strategyEvaluationId: existingDoc?.strategyEvaluationId ?? null,
  };

  const strategyEvaluationId = await syncStrategyEvaluationFromSnapshot(
    ctx,
    exp,
    doc.normalized,
    doc,
    { interpret: false }
  );
  if (strategyEvaluationId) {
    doc.strategyEvaluationId = strategyEvaluationId;
  }

  await persistExperimentEvaluationDocument(ctx, experimentId, doc);
  await applyLearningFromNormalizedEvaluation(ctx, exp, doc.normalized);

  return doc;
}
