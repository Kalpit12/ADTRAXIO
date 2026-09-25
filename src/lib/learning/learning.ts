import type { ComparisonJson, LearningConfidence, MetricSnapshot } from "./types";

export function deriveLearningConfidence(
  comparison: ComparisonJson,
  baseline: MetricSnapshot,
  outcome: MetricSnapshot
): LearningConfidence {
  const measured = comparison.rows.filter((r) => r.availability === "measured").length;
  const hasBaselineNotes = (baseline.notes?.length ?? 0) > 0;
  const hasOutcomeNotes = (outcome.notes?.length ?? 0) > 0;

  if (measured >= 5 && !hasBaselineNotes && !hasOutcomeNotes) return "high";
  if (measured >= 2) return "medium";
  return "low";
}
