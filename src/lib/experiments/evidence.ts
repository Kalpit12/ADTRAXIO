import type {
  EvidenceQualityLevel,
  EvidenceQualityReport,
  ExperimentRecord,
  ExperimentVariantRecord,
  VariantComparisonResult,
} from "./types";

export function assessEvidenceQuality(
  experiment: ExperimentRecord,
  variants: ExperimentVariantRecord[],
  comparison: VariantComparisonResult | null
): EvidenceQualityReport {
  const limitations: string[] = [
    "Observed results do not prove causation.",
    "No statistical significance test is applied.",
  ];

  const measured = comparison?.variants.filter((v) => v.availability === "measured") ?? [];
  const windowComplete =
    experiment.status === "completed" ||
    (experiment.startedAt != null &&
      Date.now() -
        new Date(experiment.startedAt).getTime() >=
        experiment.minimumObservationDays * 24 * 60 * 60 * 1000);

  let level: EvidenceQualityLevel = "insufficient";

  if (experiment.status !== "completed" && experiment.status !== "running") {
    return {
      level: "insufficient",
      summary: "Experiment is not in a measured or completed state.",
      limitations: [...limitations, "Historical evidence requires a completed measurement."],
    };
  }

  if (measured.length < 2) {
    return {
      level: "insufficient",
      summary: "Insufficient comparable measurements across variants.",
      limitations: [...limitations, "At least two variants need measured outcomes."],
    };
  }

  if (!windowComplete && experiment.status !== "completed") {
    return {
      level: "limited",
      summary:
        "Limited evidence: observation window is still in progress for some variants.",
      limitations: [...limitations, "Short observation windows reduce reliability."],
    };
  }

  const sampleLimited =
    experiment.sampleTarget != null &&
    measured.some(
      (v) => v.sampleCount != null && v.sampleCount < experiment.sampleTarget!
    );

  if (sampleLimited) {
    level = "limited";
    limitations.push("Sample volume remains below the stated target.");
  } else if (comparison?.dataAvailability === "measured") {
    level = "usable";
  }

  if (
    measured.length >= 2 &&
    windowComplete &&
    comparison?.dataAvailability === "measured" &&
    !sampleLimited &&
    experiment.endedAt
  ) {
    level = "strong";
  }

  const summary =
    level === "strong"
      ? "Strong evidence: variants have measurements across the requested observation window with comparable data."
      : level === "usable"
        ? "Usable evidence: both variants have measurements across the requested observation window."
        : level === "limited"
          ? "Limited evidence: measurements exist but sample or window constraints apply."
          : "Insufficient evidence for experiment conclusions.";

  if (level !== "strong") {
    limitations.push(
      "Insufficient evidence to determine whether the observed difference is meaningful."
    );
  }

  return { level, summary, limitations };
}
