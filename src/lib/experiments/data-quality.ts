import type { DataQualityReport, ExperimentRecord, ExperimentVariantRecord } from "./types";
import { metricValueFromSnapshot } from "./metrics";
import { observationWindowElapsed } from "./test-mode";

export function evaluateDataQuality(
  experiment: ExperimentRecord,
  variants: ExperimentVariantRecord[]
): DataQualityReport {
  const blockers: string[] = [];
  const warnings: string[] = [];
  let measured = 0;

  for (const v of variants) {
    const base = metricValueFromSnapshot(experiment.successMetric, v.baseline);
    const out = metricValueFromSnapshot(experiment.successMetric, v.outcome);
    if (base == null) warnings.push(`Variant ${v.variantKey}: missing baseline.`);
    if (out == null) warnings.push(`Variant ${v.variantKey}: missing outcome.`);
    if (base != null && out != null) measured += 1;
  }

  if (variants.length < 2) blockers.push("Fewer than two variants.");

  if (experiment.startedAt && !observationWindowElapsed(experiment.startedAt, experiment.minimumObservationDays)) {
    if (experiment.status === "running") {
      warnings.push("Observation window has not completed.");
    }
  }

  const platforms = new Set(
    variants.map((v) => experiment.platform).filter(Boolean) as string[]
  );
  if (platforms.size > 1) warnings.push("Mismatched platform context across variants.");

  const completeness =
    variants.length > 0 ? measured / variants.length : null;

  let status: DataQualityReport["status"] = "unavailable";
  if (blockers.length) status = "incomplete";
  else if (measured === 0) status = "unavailable";
  else if (measured < variants.length) status = "limited";
  else if (measured >= 2 && completeness === 1) status = "comparable";
  if (
    measured >= 2 &&
    completeness === 1 &&
    experiment.status === "completed" &&
    !warnings.some((w) => w.includes("Observation window"))
  ) {
    status = "strong";
  }

  const comparable = status === "comparable" || status === "strong";

  return { status, blockers, warnings, completeness, comparable };
}
