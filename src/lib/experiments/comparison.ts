import { compareSnapshots } from "@/lib/learning/compare";
import type {
  ExperimentVariantRecord,
  VariantComparisonResult,
  VariantObservedClassification,
} from "./types";
import { metricValueFromSnapshot, sampleCountFromSnapshot } from "./metrics";

function classifyVariantObserved(
  outcomeVal: number | null,
  peerOutcomes: number[]
): VariantObservedClassification {
  if (outcomeVal == null) return "unavailable";
  const peers = peerOutcomes.filter((p) => p != null) as number[];
  if (peers.length < 2) return "insufficient_data";
  const max = Math.max(...peers);
  const min = Math.min(...peers);
  if (max === min) return "similar_observed_result";
  if (outcomeVal === max) return "higher_observed_result";
  if (outcomeVal === min) return "lower_observed_result";
  return "similar_observed_result";
}

export function compareVariants(
  experiment: {
    successMetric: string;
    minimumObservationDays: number;
    sampleTarget: number | null;
  },
  variants: ExperimentVariantRecord[]
): VariantComparisonResult {
  const primaryMetric = experiment.successMetric;
  const rows = variants.map((v) => {
    const baselineVal = metricValueFromSnapshot(primaryMetric, v.baseline);
    const outcomeVal = metricValueFromSnapshot(primaryMetric, v.outcome);
    const comparison = compareSnapshots(v.baseline, v.outcome);
    const row = comparison.rows.find(
      (r) => r.metric.toLowerCase().includes(primaryMetric.split("_")[0])
    );
    const sample = sampleCountFromSnapshot(v.outcome);
    let availability: "measured" | "unavailable" | "insufficient_sample" = "unavailable";
    if (outcomeVal != null && baselineVal != null) {
      availability =
        experiment.sampleTarget != null &&
        sample != null &&
        sample < experiment.sampleTarget
          ? "insufficient_sample"
          : "measured";
    }
    const absoluteChange =
      row?.absoluteChange ??
      (outcomeVal != null && baselineVal != null ? outcomeVal - baselineVal : null);
    let relativeDifference: number | null = null;
    if (absoluteChange != null && baselineVal != null && baselineVal !== 0) {
      relativeDifference = (absoluteChange / baselineVal) * 100;
    }
    const observedClassification = classifyVariantObserved(
      outcomeVal,
      variants
        .map((x) => metricValueFromSnapshot(primaryMetric, x.outcome))
        .filter((v): v is number => v != null)
    );
    return {
      variantId: v.id,
      variantKey: v.variantKey,
      name: v.name,
      primaryMetricValue: outcomeVal,
      baselineValue: baselineVal,
      outcomeValue: outcomeVal,
      absoluteChange,
      percentChange: row?.percentChange ?? relativeDifference,
      relativeDifference,
      observedClassification,
      sampleCount: sample,
      availability,
    };
  });

  const measured = rows.filter((r) => r.availability === "measured" && r.primaryMetricValue != null);
  let classification: VariantComparisonResult["classification"] = "insufficient_data";
  let higherObservedVariantKey: string | null = null;

  if (!measured.length) {
    classification = "insufficient_data";
  } else if (measured.length < 2) {
    classification = "inconclusive";
  } else {
    const sorted = [...measured].sort(
      (a, b) => (b.primaryMetricValue ?? 0) - (a.primaryMetricValue ?? 0)
    );
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    higherObservedVariantKey = top.variantKey;
    const diff =
      top.primaryMetricValue != null && bottom.primaryMetricValue != null
        ? top.primaryMetricValue - bottom.primaryMetricValue
        : 0;
    if (diff === 0) classification = "inconclusive";
    else if (diff > 0 && sorted.some((r) => (r.primaryMetricValue ?? 0) < (top.primaryMetricValue ?? 0)))
      classification = "mixed_signal";
    else classification = "positive_signal";
    if (
      top.primaryMetricValue != null &&
      bottom.primaryMetricValue != null &&
      top.primaryMetricValue < bottom.primaryMetricValue
    ) {
      classification = "negative_signal";
    }
  }

  const limitations = [
    "Observed differences do not prove causation.",
    "No statistical significance test is applied in this version.",
  ];
  if (experiment.sampleTarget != null) {
    limitations.push(
      `Target sample size is ${experiment.sampleTarget}; insufficient counts may limit conclusions.`
    );
  } else {
    limitations.push(
      "Insufficient evidence to determine whether the observed difference is meaningful."
    );
  }

  const sampleCounts: Record<string, number | null> = {};
  for (const r of rows) sampleCounts[r.variantKey] = r.sampleCount;

  return {
    version: 1,
    variants: rows,
    primaryMetric,
    metricChanges: rows.map((r) => ({
      metric: primaryMetric,
      note:
        r.absoluteChange != null
          ? `${r.variantKey}: ${r.absoluteChange >= 0 ? "+" : ""}${r.absoluteChange}${
              r.percentChange != null ? ` (${r.percentChange}%)` : ""
            } (${r.observedClassification})`
          : `${r.variantKey}: unavailable`,
    })),
    sampleCounts,
    observationWindowDays: experiment.minimumObservationDays,
    dataAvailability: measured.length ? "measured" : "unavailable",
    classification,
    higherObservedVariantKey,
    limitations,
    comparedAt: new Date().toISOString(),
  };
}
