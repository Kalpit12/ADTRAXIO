import type { ComparisonJson, MetricAvailability } from "@/lib/learning/types";
import type {
  ExperimentMeasurementSnapshot,
  ExperimentRecord,
  VariantComparisonResult,
  VariantObservedClassification,
} from "@/lib/experiments/types";
import type { AttributionJson } from "./types";

export type ExperimentEvaluationLifecycle =
  | "pending"
  | "measured"
  | "evaluated"
  | "interpreted"
  | "incomplete";

export interface NormalizedVariantEvaluationRow {
  variantId: string;
  variantKey: string;
  name: string;
  baseline: number | null;
  outcome: number | null;
  absoluteDifference: number | null;
  relativeDifference: number | null;
  classification: VariantObservedClassification;
  availability: "measured" | "unavailable" | "insufficient_sample";
}

export interface NormalizedExperimentEvaluation {
  version: 1;
  experimentId: string;
  hypothesis: string;
  objective: string;
  primaryMetric: string;
  observationWindowDays: number;
  measuredAt: string;
  variantResults: NormalizedVariantEvaluationRow[];
  higherObservedVariantKey: string | null;
  dataQualityStatus: string;
  attributionStatus: string;
  limitations: string[];
  snapshotIdempotencyKey: string;
  lifecycle: ExperimentEvaluationLifecycle;
}

export interface ExperimentEvaluationInterpretation {
  version: 1;
  summary: string;
  observations: string[];
  interpretations: string[];
  limitations: string[];
  considerations: string[];
  interpretedAt?: string;
}

export interface ExperimentEvaluationDocument {
  version: 2;
  kind: "experiment";
  normalized: NormalizedExperimentEvaluation;
  interpretation?: ExperimentEvaluationInterpretation;
  strategyEvaluationId?: string | null;
}

/** Measurement snapshot comparison is authoritative — do not recompute. */
export function variantComparisonFromMeasurementSnapshot(
  snapshot: ExperimentMeasurementSnapshot
): VariantComparisonResult {
  return snapshot.comparison;
}

export function variantComparisonToComparisonJson(
  comparison: VariantComparisonResult
): ComparisonJson {
  const rows = comparison.variants.map((v) => ({
    metric: `${comparison.primaryMetric}:${v.variantKey}`,
    baseline: v.baselineValue,
    outcome: v.outcomeValue,
    absoluteChange: v.absoluteChange,
    percentChange: v.percentChange ?? v.relativeDifference,
    availability: v.availability as MetricAvailability,
  }));
  return {
    version: 1,
    rows,
    overallAvailability: comparison.dataAvailability as MetricAvailability,
    summaryNote: `Experiment variant comparison for ${comparison.primaryMetric} (snapshot ${comparison.comparedAt}).`,
  };
}

export function attributionFromMeasurementSnapshot(
  snapshot: ExperimentMeasurementSnapshot
): AttributionJson {
  const level =
    snapshot.attribution.status === "associated"
      ? "supporting_evidence"
      : snapshot.attribution.status === "limited"
        ? "correlation_only"
        : "insufficient_evidence";

  return {
    version: 1,
    level,
    evidence: snapshot.attribution.associations.slice(0, 8),
    limitations: [
      ...snapshot.attribution.limitations,
      ...snapshot.limitations.slice(0, 4),
      "Measurement association does not establish causation.",
    ],
  };
}

export function buildNormalizedExperimentEvaluation(
  experiment: ExperimentRecord,
  snapshot: ExperimentMeasurementSnapshot
): NormalizedExperimentEvaluation {
  const comparison = variantComparisonFromMeasurementSnapshot(snapshot);
  const variantResults: NormalizedVariantEvaluationRow[] = comparison.variants.map((v) => ({
    variantId: v.variantId,
    variantKey: v.variantKey,
    name: v.name,
    baseline: v.baselineValue,
    outcome: v.outcomeValue,
    absoluteDifference: v.absoluteChange,
    relativeDifference: v.relativeDifference,
    classification: v.observedClassification,
    availability: v.availability,
  }));

  let lifecycle: ExperimentEvaluationLifecycle = "evaluated";
  if (snapshot.dataQuality.status === "unavailable" || snapshot.dataQuality.status === "incomplete") {
    lifecycle = "incomplete";
  } else if (comparison.dataAvailability === "unavailable") {
    lifecycle = "incomplete";
  }

  return {
    version: 1,
    experimentId: experiment.id,
    hypothesis: experiment.hypothesis,
    objective: experiment.objective,
    primaryMetric: snapshot.primaryMetric,
    observationWindowDays: snapshot.observationWindowDays,
    measuredAt: snapshot.measuredAt,
    variantResults,
    higherObservedVariantKey: comparison.higherObservedVariantKey,
    dataQualityStatus: snapshot.dataQuality.status,
    attributionStatus: snapshot.attribution.status,
    limitations: [
      ...snapshot.dataQuality.warnings.slice(0, 3),
      ...snapshot.dataQuality.blockers.slice(0, 2),
      ...comparison.limitations.slice(0, 3),
    ],
    snapshotIdempotencyKey: snapshot.idempotencyKey,
    lifecycle,
  };
}

export function buildDeterministicExperimentInterpretation(
  normalized: NormalizedExperimentEvaluation
): ExperimentEvaluationInterpretation {
  const observations: string[] = [];
  for (const v of normalized.variantResults) {
    if (v.outcome == null) continue;
    observations.push(
      `MEASURED: Variant ${v.variantKey} ${normalized.primaryMetric} outcome ${v.outcome}.`
    );
  }
  if (normalized.higherObservedVariantKey) {
    observations.push(
      `OBSERVED: Variant ${normalized.higherObservedVariantKey} had a higher observed ${normalized.primaryMetric} during the window.`
    );
  }
  return {
    version: 1,
    summary:
      normalized.lifecycle === "incomplete"
        ? "Experiment evaluation is incomplete — insufficient comparable measurement."
        : "Deterministic experiment evaluation from measurement snapshot.",
    observations,
    interpretations: [
      "INTERPRETED: Differences may reflect audience response but are not proven causal.",
    ],
    limitations: normalized.limitations,
    considerations: [
      "UNCERTAIN: Do not treat a single experiment as a universal rule.",
      `Evidence quality: ${normalized.dataQualityStatus}; attribution: ${normalized.attributionStatus}.`,
    ],
    interpretedAt: new Date().toISOString(),
  };
}

export function experimentEvaluationIdempotencyKey(experimentId: string): string {
  return `experiment:${experimentId}`;
}

export function hasUsableMeasurementSnapshot(
  snapshot: ExperimentRecord["measurementSnapshot"]
): snapshot is ExperimentMeasurementSnapshot {
  return Boolean(snapshot && "comparison" in snapshot && snapshot.version === 1);
}
