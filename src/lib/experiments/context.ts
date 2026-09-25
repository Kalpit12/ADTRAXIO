import type { ExperimentRecord, VariantComparisonResult } from "./types";

export function formatCompletedExperimentsForPrompt(
  experiments: ExperimentRecord[]
): string {
  if (!experiments.length) {
    return "No completed experiments available as historical evidence.";
  }
  return experiments
    .map((e) => {
      const comparison = e.allocation.lastComparison;
      return [
        "COMPLETED EXPERIMENT (historical, not current performance):",
        `  experimentId: ${e.id}`,
        `  objective: ${e.objective}`,
        `  hypothesis: ${e.hypothesis}`,
        `  successMetric: ${e.successMetric}`,
        comparison
          ? `  observed: ${comparison.higherObservedVariantKey ?? "n/a"} had higher observed ${comparison.primaryMetric} (classification: ${comparison.classification})`
          : "  observed: comparison not available",
        `  limitations: ${comparison?.limitations?.[0] ?? "Correlation only."}`,
      ].join("\n");
    })
    .join("\n\n");
}

export function experimentReviewUrl(id: string): string {
  return `/assistant/experiments/${id}`;
}
