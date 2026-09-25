import type {
  AttributionReport,
  DataQualityReport,
  EvidenceQualityReport,
  ExperimentConflictFinding,
  ExperimentContextSnapshot,
  ExperimentHealthReport,
  ExperimentIntelligenceInterpretation,
  ExperimentIntelligenceSummary,
  ExperimentMeasurementSnapshot,
  ExperimentRecord,
  ExperimentVariantRecord,
  RelatedExperimentRef,
  VariantComparisonResult,
} from "./types";

export function buildDeterministicIntelligenceInterpretation(input: {
  evidenceQuality: EvidenceQualityReport;
  comparison: VariantComparisonResult;
}): ExperimentIntelligenceInterpretation {
  const higher = input.comparison.higherObservedVariantKey;
  const observations: string[] = [];
  for (const v of input.comparison.variants) {
    if (v.outcomeValue == null) continue;
    observations.push(
      `MEASURED: Variant ${v.variantKey} ${input.comparison.primaryMetric} outcome value ${v.outcomeValue}.`
    );
  }
  if (higher) {
    observations.push(
      `OBSERVED: Variant ${higher} had the higher observed ${input.comparison.primaryMetric} during the window.`
    );
  }
  return {
    version: 2,
    summary: input.evidenceQuality.summary,
    observations,
    interpretations: [
      "INTERPRETED: Differences may reflect audience response but are not proven causal.",
    ],
    limitations: input.evidenceQuality.limitations,
    historical_context: [],
    considerations: [
      "Consider whether sample size and observation window are sufficient before re-testing.",
    ],
    interpretedAt: new Date().toISOString(),
  };
}

export function buildExperimentSummary(input: {
  experiment: ExperimentRecord;
  variants: ExperimentVariantRecord[];
  health: ExperimentHealthReport;
  evidenceQuality: EvidenceQualityReport;
  comparison: VariantComparisonResult;
  relatedExperiments: RelatedExperimentRef[];
  conflictingFindings: ExperimentConflictFinding[];
  dataQuality?: DataQualityReport;
  attribution?: AttributionReport;
  contextSnapshot?: ExperimentContextSnapshot | null;
  measurementSnapshot?: ExperimentMeasurementSnapshot | null;
}): ExperimentIntelligenceSummary {
  const limitations = [
    ...input.evidenceQuality.limitations,
    ...input.comparison.limitations,
  ].slice(0, 8);

  let nextConsideration =
    "Review limitations before applying results to future strategy.";
  if (
    input.evidenceQuality.level === "limited" ||
    input.evidenceQuality.level === "insufficient"
  ) {
    nextConsideration =
      "Consider additional testing with a larger observation window.";
  }
  if (input.conflictingFindings.length) {
    nextConsideration =
      "Historical experiments show mixed observed results — avoid universal conclusions.";
  }

  return {
    experimentId: input.experiment.id,
    hypothesis: input.experiment.hypothesis,
    objective: input.experiment.objective,
    primaryMetric: input.experiment.successMetric,
    health: input.health,
    evidenceQuality: input.evidenceQuality,
    observationWindowDays: input.experiment.minimumObservationDays,
    variantResults: input.comparison.variants,
    relatedExperiments: input.relatedExperiments,
    conflictingFindings: input.conflictingFindings,
    dataQuality: input.dataQuality,
    attribution: input.attribution,
    contextSnapshot: input.contextSnapshot ?? null,
    measurementSnapshot: input.measurementSnapshot ?? null,
    interpretation: input.experiment.interpretation,
    limitations,
    nextConsideration,
  };
}

export function formatExperimentEvidenceForStrategist(
  summaries: ExperimentIntelligenceSummary[]
): string {
  if (!summaries.length) {
    return "No completed experiment intelligence available.";
  }
  return summaries
    .map((s) => {
      const higher = s.variantResults.find(
        (v) => v.observedClassification === "higher_observed_result"
      );
      return [
        "EXPERIMENT EVIDENCE (historical, not current performance):",
        `  experimentId: ${s.experimentId}`,
        `  objective: ${s.objective}`,
        `  evidenceQuality: ${s.evidenceQuality.level}`,
        s.dataQuality ? `  dataQuality: ${s.dataQuality.status}` : "",
        s.attribution ? `  attribution: ${s.attribution.status}` : "",
        higher
          ? `  observed: Variant ${higher.variantKey} had higher observed ${s.primaryMetric} during the tested window.`
          : "  observed: no clear higher observed result",
        s.conflictingFindings.length
          ? `  conflict: ${s.conflictingFindings[0].summary}`
          : "",
        s.attribution?.limitations[0]
          ? `  attributionNote: ${s.attribution.limitations[0]}`
          : "",
        `  limitation: ${s.limitations[0] ?? "Correlation only."}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

export function formatExperimentEvidenceForBrief(
  summaries: ExperimentIntelligenceSummary[]
): string | null {
  const latest = summaries[0];
  if (!latest) return null;
  const higher = latest.variantResults.find(
    (v) => v.observedClassification === "higher_observed_result"
  );
  if (!higher) return null;
  const qual =
    latest.evidenceQuality.level === "limited" || latest.evidenceQuality.level === "insufficient"
      ? "Evidence is currently limited"
      : "Evidence is usable but not conclusive";
  return `Your recent experiment "${latest.objective}" produced a higher observed ${latest.primaryMetric} result for Variant ${higher.variantKey}. ${qual} because observation and sample constraints may apply. This does not recommend changing allocation.`;
}
