import type { StrategyType } from "@/lib/strategist/types";
import type { ExperimentEvaluationDocument } from "./experiment";
import type { StrategyEvaluationRecord, StrategyObjectiveKind } from "./types";

export function strategyTypeToObjective(
  strategyType: StrategyType | string
): StrategyObjectiveKind {
  switch (strategyType) {
    case "engagement_recovery":
      return "engagement";
    case "content_growth":
    case "audience_growth":
    case "campaign_push":
      return "growth";
    case "consistency":
      return "consistency";
    case "performance_optimization":
      return "engagement";
    default:
      return "growth";
  }
}

const CLASSIFICATION_LABEL: Record<string, string> = {
  positive_signal: "Positive signal",
  negative_signal: "Negative signal",
  mixed_signal: "Mixed signal",
  insufficient_data: "Insufficient data",
  inconclusive: "Inconclusive",
};

export function formatExperimentEvaluationsForStrategist(
  docs: ExperimentEvaluationDocument[]
): string {
  if (!docs.length) {
    return "No normalized experiment evaluations available.";
  }
  return docs
    .map((doc) => {
      const n = doc.normalized;
      return [
        "EXPERIMENT EVALUATION (historical, not current performance):",
        `  experimentId: ${n.experimentId}`,
        `  objective: ${n.objective}`,
        `  primaryMetric: ${n.primaryMetric}`,
        `  dataQuality: ${n.dataQualityStatus}`,
        `  attribution: ${n.attributionStatus}`,
        n.higherObservedVariantKey
          ? `  observed: Variant ${n.higherObservedVariantKey} had higher observed ${n.primaryMetric}.`
          : "  observed: no clear higher observed result",
        `  lifecycle: ${n.lifecycle}`,
        `  limitation: ${n.limitations[0] ?? "Correlation only."}`,
      ].join("\n");
    })
    .join("\n\n");
}

export function formatEvaluatedStrategiesForPrompt(
  records: StrategyEvaluationRecord[]
): string {
  if (!records.length) {
    return "No prior strategy evaluations with status evaluated.";
  }
  return records
    .map((e) => {
      const interp = e.evaluation as { summary?: string; objectiveResult?: string };
      const classification =
        (e.evaluation as { resultClassification?: string }).resultClassification ??
        "inconclusive";
      return [
        `STRATEGY EVALUATION (not current performance):`,
        `  evaluationId: ${e.id}`,
        `  strategicPlanId: ${e.strategicPlanId}`,
        `  objective: ${e.objective}`,
        `  result: ${CLASSIFICATION_LABEL[classification] ?? classification}`,
        `  confidence: ${e.confidence}`,
        `  attribution: ${e.attribution.level}`,
        `  summary: ${interp.summary ?? interp.objectiveResult ?? "—"}`,
        `  limitations: ${e.attribution.limitations.slice(0, 2).join("; ") || "—"}`,
      ].join("\n");
    })
    .join("\n\n");
}

export function formatEvaluationSummary(record: StrategyEvaluationRecord): {
  objective: string;
  measuredChange: string;
  resultClassification: string;
  confidence: string;
  attributionLevel: string;
  evidence: string[];
  limitations: string[];
  summary: string;
} {
  const classification =
    (record.evaluation as { resultClassification?: string }).resultClassification ??
    record.status;
  const measured = record.comparison.rows
    .filter((r) => r.availability === "measured" && r.absoluteChange != null)
    .map((r) => {
      const pct = r.percentChange != null ? ` (${r.percentChange}%)` : "";
      return `${r.metric} changed ${r.absoluteChange! >= 0 ? "up" : "down"}${pct}.`;
    });
  const interp = record.evaluation as { summary?: string };
  return {
    objective: record.objective,
    measuredChange: measured[0] ?? "No measured objective metrics.",
    resultClassification: CLASSIFICATION_LABEL[classification] ?? String(classification),
    confidence: record.confidence,
    attributionLevel: record.attribution.level.replace(/_/g, " "),
    evidence: record.attribution.evidence,
    limitations: [
      ...record.attribution.limitations,
      ...((record.evaluation as { limitations?: string[] }).limitations ?? []),
    ],
    summary: interp.summary ?? "",
  };
}
