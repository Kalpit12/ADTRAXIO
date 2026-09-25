import type { AssistantContext } from "@/lib/assistant/types";
import { hasUsableMeasurementSnapshot } from "@/lib/evaluation/experiment";
import type { ExperimentRecord } from "@/lib/experiments/types";
import { loadCompletedExperimentsForEvidence, loadExperimentLearnings } from "./load";
import { parseExperimentIdFromLearningKey } from "./normalize";
import type {
  CrossExperimentEvidenceResult,
  CrossExperimentObservation,
  ObservedPatternClassification,
} from "./types";

function groupingKey(exp: ExperimentRecord): string {
  const contentTypes = exp.contentContext?.contentTypes;
  const ct = Array.isArray(contentTypes) ? String(contentTypes[0] ?? "") : "";
  return [
    exp.platform ?? "any-platform",
    exp.successMetric,
    exp.objective.slice(0, 80).toLowerCase(),
    ct,
  ].join("|");
}

function observationFromExperiment(
  exp: ExperimentRecord,
  learningIds: string[]
): CrossExperimentObservation {
  const snap = hasUsableMeasurementSnapshot(exp.measurementSnapshot)
    ? exp.measurementSnapshot
    : null;
  const cmp = snap?.comparison ?? exp.allocation.lastComparison ?? null;
  const normalized = exp.experimentEvaluation?.normalized;
  return {
    experimentId: exp.id,
    experimentName: exp.name,
    platform: exp.platform,
    metric: exp.successMetric,
    objective: exp.objective,
    higherObservedVariantKey: cmp?.higherObservedVariantKey ?? null,
    observationWindowDays: exp.minimumObservationDays,
    evidenceQuality: normalized?.dataQualityStatus ?? exp.evidenceQuality,
    attributionStatus: normalized?.attributionStatus ?? snap?.attribution.status ?? null,
    endedAt: exp.endedAt,
    trace: {
      experimentId: exp.id,
      evaluationId: exp.experimentEvaluation?.strategyEvaluationId ?? null,
      learningOutcomeIds: learningIds,
    },
  };
}

function classifyPattern(
  observations: CrossExperimentObservation[]
): ObservedPatternClassification {
  const withKey = observations.filter((o) => o.higherObservedVariantKey);
  if (observations.length < 2) return "insufficient_evidence";
  if (!withKey.length) return "unavailable";
  const keys = new Set(withKey.map((o) => o.higherObservedVariantKey));
  if (keys.size === 1) return "consistent_observed_pattern";
  return "mixed_observed_pattern";
}

function buildSummary(
  classification: ObservedPatternClassification,
  group: CrossExperimentObservation[],
  metric: string
): string {
  if (!group.length) return "No completed experiments in scope.";
  if (classification === "insufficient_evidence") {
    return "Evidence remains limited — fewer than two comparable completed experiments.";
  }
  if (classification === "unavailable") {
    return "Evidence remains limited — no clear higher-observed variant across experiments.";
  }
  if (classification === "mixed_observed_pattern") {
    return `Observed across ${group.length} experiments: results are mixed for ${metric}.`;
  }
  const key = group[0]?.higherObservedVariantKey;
  const count = group.filter((o) => o.higherObservedVariantKey === key).length;
  return `Observed across ${group.length} comparable experiments, variant ${key} produced the higher observed ${metric} result in ${count}.`;
}

export async function getCrossExperimentEvidence(
  ctx: AssistantContext,
  filters?: {
    platform?: string;
    metric?: string;
    objectiveContains?: string;
    limit?: number;
  }
): Promise<CrossExperimentEvidenceResult> {
  let experiments = await loadCompletedExperimentsForEvidence(ctx, {
    platform: filters?.platform,
    metric: filters?.metric,
    limit: filters?.limit,
  });
  if (filters?.objectiveContains) {
    const q = filters.objectiveContains.toLowerCase();
    experiments = experiments.filter((e) => e.objective.toLowerCase().includes(q));
  }

  const learnings = await loadExperimentLearnings(ctx, 80);
  const learningByExperiment = new Map<string, string[]>();
  for (const lo of learnings) {
    const { experimentId } = parseExperimentIdFromLearningKey(lo.idempotencyKey);
    if (!experimentId) continue;
    const list = learningByExperiment.get(experimentId) ?? [];
    list.push(lo.id);
    learningByExperiment.set(experimentId, list);
  }

  if (!experiments.length) {
    return {
      classification: "unavailable",
      summary: "No completed experiments match the filters.",
      sampleCount: 0,
      groupingKey: "",
      supportingObservations: [],
      conflictingObservations: [],
      observationWindows: [],
      limitations: ["Do not treat absence of data as a pattern."],
      traceability: [],
    };
  }

  const primaryGroupKey = groupingKey(experiments[0]);
  const comparable = experiments.filter((e) => groupingKey(e) === primaryGroupKey);
  const observations = comparable.map((e) =>
    observationFromExperiment(e, learningByExperiment.get(e.id) ?? [])
  );

  const classification = classifyPattern(observations);
  const metric = comparable[0]?.successMetric ?? "metric";

  const byVariant = new Map<string, CrossExperimentObservation[]>();
  for (const o of observations) {
    const k = o.higherObservedVariantKey ?? "unclear";
    const list = byVariant.get(k) ?? [];
    list.push(o);
    byVariant.set(k, list);
  }

  let supporting: CrossExperimentObservation[] = [];
  let conflicting: CrossExperimentObservation[] = [];
  if (classification === "consistent_observed_pattern") {
    const dominant = [...byVariant.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    supporting = dominant?.[1] ?? [];
    conflicting = observations.filter((o) => !supporting.includes(o));
  } else if (classification === "mixed_observed_pattern") {
    const entries = [...byVariant.entries()].filter(([k]) => k !== "unclear");
    if (entries.length >= 2) {
      supporting = entries[0][1];
      conflicting = entries[1][1];
    } else {
      supporting = observations.slice(0, Math.ceil(observations.length / 2));
      conflicting = observations.slice(Math.ceil(observations.length / 2));
    }
  } else {
    supporting = observations;
  }

  return {
    classification,
    summary: buildSummary(classification, observations, metric),
    sampleCount: observations.length,
    groupingKey: primaryGroupKey,
    supportingObservations: supporting,
    conflictingObservations: conflicting,
    observationWindows: observations
      .map((o) => o.observationWindowDays)
      .filter((d): d is number => d != null),
    limitations: [
      "Cross-experiment patterns describe historical observations, not causation.",
      "Do not treat any pattern as proven or as a universal winner.",
      comparable.length < experiments.length
        ? "Some experiments were excluded due to differing platform, metric, objective, or content type context."
        : "Comparable dimensions: platform, metric, objective, and primary content type where available.",
    ],
    traceability: observations.map((o) => ({
      experimentId: o.experimentId,
      evaluationId: o.trace.evaluationId,
      learningOutcomeId: o.trace.learningOutcomeIds[0] ?? null,
    })),
  };
}
