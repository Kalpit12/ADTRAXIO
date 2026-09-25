import type { CrossExperimentEvidenceResult, CrossExperimentLearningsResult } from "./types";

export function formatCrossExperimentEvidenceForStrategist(
  evidence: CrossExperimentEvidenceResult
): string {
  if (!evidence.sampleCount) {
    return "CROSS-EXPERIMENT EVIDENCE: No comparable completed experiments.";
  }
  const lines = [
    "CROSS-EXPERIMENT EVIDENCE (historical, not current performance):",
    `  classification: ${evidence.classification}`,
    `  summary: ${evidence.summary}`,
    `  sampleCount: ${evidence.sampleCount}`,
    evidence.supportingObservations.length
      ? `  supporting: ${evidence.supportingObservations.length} observation(s)`
      : "",
    evidence.conflictingObservations.length
      ? `  conflicting: ${evidence.conflictingObservations.length} observation(s)`
      : "",
    `  limitation: ${evidence.limitations[0] ?? "Correlation only."}`,
    evidence.traceability[0]
      ? `  trace: experimentId ${evidence.traceability[0].experimentId}`
      : "",
  ].filter(Boolean);
  return lines.join("\n");
}

export function formatCrossExperimentLearningsForStrategist(
  result: CrossExperimentLearningsResult
): string {
  if (!result.links.length) {
    return "EXPERIMENT-LINKED LEARNING: None in scope.";
  }
  return result.links
    .slice(0, 6)
    .map((l) =>
      [
        "EXPERIMENT-LINKED LEARNING (historical):",
        `  learningOutcomeId: ${l.learningOutcomeId}`,
        `  experimentId: ${l.experimentId}`,
        `  variantId: ${l.experimentVariantId ?? "—"}`,
        `  status: ${l.status}`,
        `  metric: ${l.metric ?? "—"}`,
        `  evidenceQuality: ${l.evidenceQuality ?? "—"}`,
      ].join("\n")
    )
    .join("\n\n");
}

export function formatCrossExperimentEvidenceForBrief(
  evidence: CrossExperimentEvidenceResult
): string | null {
  if (evidence.sampleCount < 2) return null;
  if (evidence.classification === "mixed_observed_pattern") {
    return `${evidence.summary} Results were mixed where platforms or contexts differ.`;
  }
  if (evidence.classification === "consistent_observed_pattern") {
    return `${evidence.summary} This is informational only — not automatic optimization.`;
  }
  return null;
}
