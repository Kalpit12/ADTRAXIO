import type { AssistantContext } from "@/lib/assistant/types";
import { compareVariants } from "@/lib/experiments/comparison";
import { metricValueFromSnapshot } from "@/lib/experiments/metrics";
import { buildMeasurementSnapshot } from "@/lib/experiments/measurement-snapshot";
import { captureContentBaseline, captureWorkspaceBaseline } from "@/lib/learning/baseline";
import { getExperiment } from "@/lib/experiments/service";
import { observationWindowElapsed } from "@/lib/experiments/test-mode";
import type { ExperimentRecord, ExperimentVariantRecord } from "@/lib/experiments/types";
import { getOptimizationProposal, listOptimizationProposals } from "./service";
import type {
  OptimizationExecutionRecord,
  OptimizationObservedClassification,
  OptimizationOutcomeRecord,
  OptimizationProposalRecord,
} from "./types";
import { OptimizationValidationError } from "./validation";

export function optimizationOutcomeIdempotencyKey(executionId: string): string {
  return `opt-outcome:${executionId}`;
}

function classifyPrePostOverall(
  baselineValues: Record<string, number | null>,
  postValues: Record<string, number | null>,
  weights: Record<string, number>
): OptimizationObservedClassification {
  let weightedBefore = 0;
  let weightedAfter = 0;
  let weightSum = 0;
  for (const key of Object.keys(weights)) {
    const before = baselineValues[key];
    const after = postValues[key];
    if (before == null || after == null) continue;
    const w = weights[key] / 100;
    weightedBefore += before * w;
    weightedAfter += after * w;
    weightSum += w;
  }
  if (weightSum === 0) return "insufficient_data";
  const scale = Math.max(Math.abs(weightedBefore), 1);
  const epsilon = scale * 0.001;
  if (weightedAfter > weightedBefore + epsilon) return "higher_observed_result";
  if (weightedAfter < weightedBefore - epsilon) return "lower_observed_result";
  return "similar_observed_result";
}

function variantMetricMap(
  exp: ExperimentRecord,
  variants: ExperimentVariantRecord[]
): Record<string, number | null> {
  const metric = exp.successMetric;
  return Object.fromEntries(
    variants.map((v) => [
      v.variantKey,
      metricValueFromSnapshot(metric, v.outcome) ??
        metricValueFromSnapshot(metric, v.baseline),
    ])
  );
}

export async function initializeOptimizationOutcome(
  ctx: AssistantContext,
  proposal: OptimizationProposalRecord,
  execution: OptimizationExecutionRecord
): Promise<OptimizationOutcomeRecord> {
  const exp = await getExperiment(ctx, proposal.sourceId);
  if (!exp) throw new OptimizationValidationError("Experiment not found for outcome.");

  const variants = exp.variants ?? [];
  const outcome: OptimizationOutcomeRecord = {
    optimizationProposalId: proposal.id,
    optimizationExecutionId: execution.id,
    experimentId: execution.experimentId,
    executedAt: execution.executedAt,
    previousAllocation: execution.previousAllocation,
    executedAllocation: execution.executedAllocation,
    measurementWindow: {
      startedAt: execution.executedAt,
      days: exp.minimumObservationDays,
    },
    baseline: {
      capturedAt: execution.executedAt,
      metric: exp.successMetric,
      variantValues: variantMetricMap(exp, variants),
      allocations: execution.previousAllocation,
    },
    status: "pending",
    limitations: [
      "Execution changed allocation only; performance outcome is measured separately.",
      "No causal claim is made from execution alone.",
    ],
    idempotencyKey: optimizationOutcomeIdempotencyKey(execution.id),
    executionSummary: formatExecutionSummary(execution),
  };

  await ctx.supabase
    .from("ai_optimization_proposals")
    .update({
      outcome_json: outcome,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposal.id)
    .eq("organization_id", ctx.organizationId);

  return outcome;
}

export function formatExecutionSummary(execution: OptimizationExecutionRecord): string {
  const parts = Object.keys(execution.executedAllocation).map((key) => {
    const from = execution.previousAllocation[key];
    const to = execution.executedAllocation[key];
    if (from == null || to == null) return null;
    return `${key}: ${from}% → ${to}%`;
  }).filter(Boolean);
  return `Execution: allocation changed (${parts.join(", ")}).`;
}

export function formatOutcomeSummary(
  outcome: OptimizationOutcomeRecord
): string {
  if (outcome.status === "pending") {
    return "Outcome: measurement is pending for the post-change observation window.";
  }
  const classif = outcome.observedDifference?.classification ?? "unavailable";
  const metric = outcome.baseline.metric;
  if (classif === "insufficient_data" || classif === "unavailable") {
    return `Outcome: post-change ${metric} data was ${classif.replace(/_/g, " ")}.`;
  }
  return `Outcome: after the observation window, observed ${metric} was ${classif.replace(/_/g, " ")} (not a causal claim).`;
}

export function buildObservedDifference(
  exp: ExperimentRecord,
  baseline: OptimizationOutcomeRecord["baseline"],
  postVariants: ExperimentVariantRecord[],
  weightAllocations: Record<string, number>
): OptimizationOutcomeRecord["observedDifference"] {
  const postValues = variantMetricMap(exp, postVariants);
  const absoluteDifference: Record<string, number | null> = {};
  const relativeDifferencePercent: Record<string, number | null> = {};
  let hasData = false;

  for (const key of Object.keys(baseline.variantValues)) {
    const before = baseline.variantValues[key];
    const after = postValues[key];
    if (before != null && after != null) {
      hasData = true;
      absoluteDifference[key] = after - before;
      relativeDifferencePercent[key] =
        before !== 0 ? ((after - before) / before) * 100 : null;
    } else {
      absoluteDifference[key] = null;
      relativeDifferencePercent[key] = null;
    }
  }

  const weights =
    Object.keys(weightAllocations).length > 0
      ? weightAllocations
      : Object.fromEntries(Object.keys(postValues).map((k) => [k, 100 / Math.max(1, Object.keys(postValues).length)]));

  let classification: OptimizationObservedClassification = classifyPrePostOverall(
    baseline.variantValues,
    postValues,
    weights
  );
  if (!hasData) classification = "insufficient_data";

  const comparison = compareVariants(exp, postVariants);

  return {
    metric: baseline.metric,
    classification,
    absoluteDifference,
    relativeDifferencePercent,
    observationWindowDays: exp.minimumObservationDays,
    limitations: [
      ...comparison.limitations,
      "Observed difference is descriptive only; not statistical significance.",
    ],
  };
}

async function refreshVariantOutcomes(
  ctx: AssistantContext,
  exp: ExperimentRecord,
  variants: ExperimentVariantRecord[]
): Promise<ExperimentVariantRecord[]> {
  for (const v of variants) {
    let outcome = await captureWorkspaceBaseline(ctx, {
      windowDays: exp.minimumObservationDays,
      platform: exp.platform,
    });
    if (v.contentId) {
      outcome = await captureContentBaseline(ctx, v.contentId);
    }
    await ctx.supabase
      .from("ai_experiment_variants")
      .update({
        outcome_json: outcome,
        updated_at: new Date().toISOString(),
      })
      .eq("id", v.id);
  }
  const refreshed = await getExperiment(ctx, exp.id);
  return refreshed?.variants ?? variants;
}

export function outcomeWindowElapsed(
  executedAt: string,
  minimumObservationDays: number
): boolean {
  return observationWindowElapsed(executedAt, minimumObservationDays);
}

export async function syncOptimizationOutcome(
  ctx: AssistantContext,
  proposalId: string,
  options?: { force?: boolean }
): Promise<OptimizationOutcomeRecord | null> {
  const proposal = await getOptimizationProposal(ctx, proposalId);
  if (!proposal?.execution) return null;
  if (proposal.status !== "executed") return proposal.outcome;

  const existing = proposal.outcome;
  if (existing?.status === "evaluated" && existing.measuredAt && !options?.force) {
    return existing;
  }

  const execution = proposal.execution;
  const exp = await getExperiment(ctx, execution.experimentId);
  if (!exp) return existing;

  if (!options?.force && !outcomeWindowElapsed(execution.executedAt, exp.minimumObservationDays)) {
    return existing ?? (await initializeOptimizationOutcome(ctx, proposal, execution));
  }

  let variants = exp.variants ?? [];
  variants = await refreshVariantOutcomes(ctx, exp, variants);
  const comparison = compareVariants(exp, variants);
  const { evaluateDataQuality } = await import("@/lib/experiments/data-quality");
  const { validateExperimentAttribution } = await import("@/lib/experiments/attribution");
  const dataQuality = evaluateDataQuality(exp, variants);
  const attribution = validateExperimentAttribution(exp, variants);

  const measurementSnapshot = buildMeasurementSnapshot({
    experiment: exp,
    variants,
    comparison,
    dataQuality,
    attribution,
    optimizationProposalId: proposal.id,
    optimizationExecutionId: execution.id,
  });

  await ctx.supabase
    .from("ai_experiments")
    .update({
      measurement_snapshot_json: measurementSnapshot,
      updated_at: new Date().toISOString(),
    })
    .eq("id", exp.id)
    .eq("organization_id", ctx.organizationId);

  const { runExperimentEvaluation } = await import("@/lib/evaluation/experiment-run");
  const evalDoc = await runExperimentEvaluation(ctx, exp.id, { interpret: false });

  const { measureLearningOutcome } = await import("@/lib/learning/service");
  for (const v of variants) {
    const key = `experiment:${exp.id}:variant:${v.id}`;
    const { data: learning } = await ctx.supabase
      .from("ai_learning_outcomes")
      .select("id")
      .eq("organization_id", ctx.organizationId)
      .eq("idempotency_key", key)
      .maybeSingle();
    if (learning?.id) {
      try {
        await measureLearningOutcome(ctx, learning.id, {
          interpret: false,
          skipWindowCheck: true,
        });
      } catch {
        /* best effort */
      }
    }
  }

  const normalized = evalDoc?.normalized;
  const baselineBlock =
    existing?.baseline ?? {
      capturedAt: execution.executedAt,
      metric: exp.successMetric,
      variantValues: variantMetricMap(exp, variants),
      allocations: execution.previousAllocation,
    };
  const observedDifference = buildObservedDifference(
    exp,
    baselineBlock,
    variants,
    execution.executedAllocation
  );

  const now = new Date().toISOString();
  let status: OptimizationOutcomeRecord["status"] = "measured";
  if (!normalized || normalized.lifecycle === "incomplete") {
    status = "inconclusive";
  } else if (
    normalized.dataQualityStatus === "unavailable" ||
    observedDifference?.classification === "insufficient_data"
  ) {
    status = "insufficient_data";
  } else if (normalized.lifecycle === "evaluated" || normalized.lifecycle === "interpreted") {
    status = "evaluated";
  }

  const learningOutcomeKeys = variants.map(
    (v) => `experiment:${exp.id}:variant:${v.id}`
  );

  const outcome: OptimizationOutcomeRecord = {
    optimizationProposalId: proposal.id,
    optimizationExecutionId: execution.id,
    experimentId: execution.experimentId,
    executedAt: execution.executedAt,
    previousAllocation: execution.previousAllocation,
    executedAllocation: execution.executedAllocation,
    measurementWindow: {
      startedAt: execution.executedAt,
      days: exp.minimumObservationDays,
      endedAt: now,
    },
    baseline: baselineBlock,
    outcome: {
      capturedAt: now,
      metric: exp.successMetric,
      variantValues: variantMetricMap(exp, variants),
      allocations: execution.executedAllocation,
    },
    observedDifference,
    evidenceQuality: normalized?.dataQualityStatus ?? dataQuality.status,
    attributionStatus: normalized?.attributionStatus ?? attribution.status,
    status,
    limitations: [
      ...(normalized?.limitations ?? []),
      ...(observedDifference?.limitations ?? []),
      "Outcome describes observed measurement; execution success is separate.",
    ],
    measuredAt: now,
    evaluatedAt: normalized ? now : null,
    idempotencyKey: optimizationOutcomeIdempotencyKey(execution.id),
    learningOutcomeKeys,
    executionSummary: formatExecutionSummary(execution),
    outcomeSummary: "",
  };
  outcome.outcomeSummary = formatOutcomeSummary(outcome);

  const executionPayload = {
    ...execution,
    status: "measured" as const,
    message: outcome.outcomeSummary,
  };

  await ctx.supabase
    .from("ai_optimization_proposals")
    .update({
      outcome_json: outcome,
      execution_json: executionPayload,
      updated_at: now,
    })
    .eq("id", proposal.id)
    .eq("organization_id", ctx.organizationId);

  return outcome;
}

export async function getOptimizationOutcome(
  ctx: AssistantContext,
  proposalId: string
): Promise<OptimizationOutcomeRecord | null> {
  const proposal = await getOptimizationProposal(ctx, proposalId);
  return proposal?.outcome ?? null;
}

export interface OptimizationOutcomeHistoryRow {
  optimizationProposalId: string;
  experimentId: string;
  platform: string | null;
  previousAllocation: Record<string, number>;
  executedAllocation: Record<string, number>;
  metric: string;
  observedResult: string | null;
  evidenceQuality: string | null;
  status: OptimizationOutcomeRecord["status"];
  executedAt: string;
}

export async function listOptimizationOutcomeHistory(
  ctx: AssistantContext,
  filters?: {
    status?: string;
    experimentId?: string;
    platform?: string;
    metric?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }
): Promise<OptimizationOutcomeHistoryRow[]> {
  const proposals = await listOptimizationProposals(ctx, filters?.limit ?? 50);
  const rows: OptimizationOutcomeHistoryRow[] = [];
  for (const p of proposals) {
    if (p.status !== "executed" && p.status !== "rolled_back") continue;
    if (!p.execution) continue;
    const exp = await getExperiment(ctx, p.sourceId);
    if (filters?.experimentId && p.sourceId !== filters.experimentId) continue;
    if (filters?.platform && exp?.platform !== filters.platform) continue;
    if (filters?.dateFrom && p.execution.executedAt < filters.dateFrom) continue;
    if (filters?.dateTo && p.execution.executedAt > filters.dateTo) continue;
    const outcome = p.outcome;
    const status = outcome?.status ?? "pending";
    if (filters?.status && status !== filters.status) continue;
    const metric = outcome?.baseline.metric || exp?.successMetric || "";
    if (filters?.metric && metric !== filters.metric) continue;
    rows.push({
      optimizationProposalId: p.id,
      experimentId: p.sourceId,
      platform: exp?.platform ?? null,
      previousAllocation: p.execution.previousAllocation,
      executedAllocation: p.execution.executedAllocation,
      metric,
      observedResult: outcome?.observedDifference?.classification ?? null,
      evidenceQuality: outcome?.evidenceQuality ?? null,
      status,
      executedAt: p.execution.executedAt,
    });
  }
  return rows;
}

export async function listOptimizationOutcomes(
  ctx: AssistantContext,
  filters?: {
    status?: string;
    experimentId?: string;
    platform?: string;
    metric?: string;
    limit?: number;
  }
): Promise<OptimizationOutcomeRecord[]> {
  const proposals = await listOptimizationProposals(ctx, filters?.limit ?? 40);
  const outcomes: OptimizationOutcomeRecord[] = [];
  for (const p of proposals) {
    if (!p.outcome && p.execution) {
      outcomes.push({
        optimizationProposalId: p.id,
        optimizationExecutionId: p.execution.id,
        experimentId: p.execution.experimentId,
        executedAt: p.execution.executedAt,
        previousAllocation: p.execution.previousAllocation,
        executedAllocation: p.execution.executedAllocation,
        measurementWindow: { startedAt: p.execution.executedAt, days: 0 },
        baseline: {
          capturedAt: p.execution.executedAt,
          metric: "",
          variantValues: {},
          allocations: p.execution.previousAllocation,
        },
        status: "pending",
        limitations: [p.execution.message],
        idempotencyKey: optimizationOutcomeIdempotencyKey(p.execution.id),
        executionSummary: formatExecutionSummary(p.execution),
      });
      continue;
    }
    if (!p.outcome) continue;
    if (filters?.status && p.outcome.status !== filters.status) continue;
    if (filters?.experimentId && p.sourceId !== filters.experimentId) continue;
    if (filters?.metric && p.outcome.baseline.metric !== filters.metric) continue;
    if (filters?.platform) {
      const exp = await getExperiment(ctx, p.sourceId);
      if (exp?.platform !== filters.platform) continue;
    }
    outcomes.push(p.outcome);
  }
  return outcomes;
}

export function formatOptimizationOutcomesForStrategist(
  outcomes: OptimizationOutcomeRecord[]
): string {
  if (!outcomes.length) {
    return "OPTIMIZATION OUTCOMES: None measured yet.";
  }
  return [
    "OPTIMIZATION OUTCOMES (separate from current performance and validated learning):",
    ...outcomes.slice(0, 8).map((o) => {
      return [
        `- proposal ${o.optimizationProposalId}`,
        `  execution: ${o.executionSummary ?? formatExecutionSummary({
          id: o.optimizationExecutionId,
          proposalId: o.optimizationProposalId,
          experimentId: o.experimentId,
          status: "measured",
          message: "",
          previousAllocation: o.previousAllocation,
          executedAllocation: o.executedAllocation,
          executedAt: o.executedAt,
          executedBy: "",
        })}`,
        `  outcome: ${o.outcomeSummary ?? formatOutcomeSummary(o)}`,
        `  status: ${o.status}`,
        `  evidence: ${o.evidenceQuality ?? "—"} · attribution: ${o.attributionStatus ?? "—"}`,
      ].join("\n");
    }),
  ].join("\n");
}

export async function syncPendingOptimizationOutcomes(ctx: AssistantContext): Promise<number> {
  const proposals = await listOptimizationProposals(ctx, 30);
  let synced = 0;
  for (const p of proposals) {
    if (p.status !== "executed" || !p.execution) continue;
    if (p.outcome?.status === "evaluated" || p.outcome?.status === "measured") continue;
    const exp = await getExperiment(ctx, p.sourceId);
    if (!exp) continue;
    if (!outcomeWindowElapsed(p.execution.executedAt, exp.minimumObservationDays)) continue;
    try {
      await syncOptimizationOutcome(ctx, p.id);
      synced += 1;
    } catch {
      /* continue */
    }
  }
  return synced;
}
