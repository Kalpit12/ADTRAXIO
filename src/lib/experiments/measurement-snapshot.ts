import type {
  ExperimentMeasurementSnapshot,
  ExperimentRecord,
  ExperimentVariantRecord,
  VariantComparisonResult,
} from "./types";
import type { AttributionReport } from "./types";
import type { DataQualityReport } from "./types";

export function buildMeasurementSnapshot(input: {
  experiment: ExperimentRecord;
  variants: ExperimentVariantRecord[];
  comparison: VariantComparisonResult;
  dataQuality: DataQualityReport;
  attribution: AttributionReport;
  optimizationProposalId?: string | null;
  optimizationExecutionId?: string | null;
}): ExperimentMeasurementSnapshot {
  const idempotencyKey = `measure:${input.experiment.id}:${input.experiment.startedAt ?? "nostart"}`;
  return {
    version: 1,
    idempotencyKey,
    measuredAt: new Date().toISOString(),
    observationWindowDays: input.experiment.minimumObservationDays,
    primaryMetric: input.experiment.successMetric,
    secondaryMetrics: input.experiment.secondaryMetrics,
    comparison: input.comparison,
    dataQuality: input.dataQuality,
    attribution: input.attribution,
    limitations: [
      ...input.dataQuality.warnings.slice(0, 3),
      ...input.attribution.limitations.slice(0, 3),
      ...input.comparison.limitations.slice(0, 2),
    ],
    optimizationProposalId: input.optimizationProposalId ?? null,
    optimizationExecutionId: input.optimizationExecutionId ?? null,
  };
}

export function shouldPersistMeasurement(
  existing: ExperimentMeasurementSnapshot | Record<string, never>,
  next: ExperimentMeasurementSnapshot
): boolean {
  if (!existing || !("idempotencyKey" in existing)) return true;
  return existing.idempotencyKey !== next.idempotencyKey;
}
