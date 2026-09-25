import { allocationRequiresHundredPercent, validateFixedSplitAllocation } from "./allocation";
import type {
  ExperimentHealthReport,
  ExperimentHealthStatus,
  ExperimentRecord,
  ExperimentVariantRecord,
} from "./types";
import { metricValueFromSnapshot } from "./metrics";

function hasMetricSnapshot(v: ExperimentVariantRecord, metric: string): boolean {
  return metricValueFromSnapshot(metric, v.outcome) != null;
}

export function evaluateExperimentHealth(
  experiment: ExperimentRecord,
  variants: ExperimentVariantRecord[]
): ExperimentHealthReport {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const totalVariantCount = variants.length;
  let measuredVariantCount = 0;

  for (const v of variants) {
    if (hasMetricSnapshot(v, experiment.successMetric)) measuredVariantCount += 1;
  }

  let observationProgress: number | null = null;
  if (experiment.startedAt && experiment.minimumObservationDays > 0) {
    const elapsedMs = Date.now() - new Date(experiment.startedAt).getTime();
    const windowMs = experiment.minimumObservationDays * 24 * 60 * 60 * 1000;
    observationProgress = Math.min(1, Math.max(0, elapsedMs / windowMs));
  }

  const dataCompleteness =
    totalVariantCount > 0 ? measuredVariantCount / totalVariantCount : null;

  if (totalVariantCount < 2) {
    blockers.push("At least two variants are required.");
  }

  try {
    if (
      allocationRequiresHundredPercent(experiment.status) &&
      experiment.allocationType === "fixed_split"
    ) {
      validateFixedSplitAllocation(variants);
    }
  } catch (e) {
    blockers.push(e instanceof Error ? e.message : "Invalid allocation.");
  }

  let status: ExperimentHealthStatus = "draft";
  switch (experiment.status) {
    case "draft":
      status = "draft";
      break;
    case "review":
      status = "awaiting_review";
      break;
    case "approved":
      status = blockers.length ? "incomplete" : "ready";
      break;
    case "running":
      if (observationProgress != null && observationProgress >= 1) {
        status = "ready_to_measure";
      } else {
        status = "collecting_data";
      }
      break;
    case "paused":
      status = "collecting_data";
      warnings.push("Experiment is paused.");
      break;
    case "completed":
      if (measuredVariantCount >= 2) status = "measured";
      else if (measuredVariantCount === 0) status = "insufficient_data";
      else status = "incomplete";
      break;
    case "cancelled":
      status = "incomplete";
      break;
    default:
      status = "draft";
  }

  if (experiment.status === "running") status = "running";

  if (measuredVariantCount < totalVariantCount && experiment.status === "completed") {
    warnings.push("Not all variants have comparable measurements.");
  }

  const readiness =
    blockers.length > 0
      ? "blocked"
      : status === "ready_to_measure"
        ? "ready_to_measure"
        : status === "measured"
          ? "evaluated"
          : "in_progress";

  return {
    status,
    readiness,
    blockers,
    warnings,
    measuredVariantCount,
    totalVariantCount,
    observationProgress,
    dataCompleteness,
  };
}
