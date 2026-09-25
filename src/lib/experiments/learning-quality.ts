import type { AttributionReport, DataQualityReport } from "./types";

export interface LearningGateResult {
  allowStrongLearning: boolean;
  learningStatus: "measured" | "insufficient_data" | "pending";
  reason: string;
}

export function gateExperimentLearning(
  dataQuality: DataQualityReport,
  attribution: AttributionReport
): LearningGateResult {
  if (dataQuality.status === "unavailable" || dataQuality.status === "incomplete") {
    return {
      allowStrongLearning: false,
      learningStatus: "insufficient_data",
      reason: "Data quality insufficient for strong learning.",
    };
  }
  if (attribution.status === "unavailable") {
    return {
      allowStrongLearning: false,
      learningStatus: "insufficient_data",
      reason: "Attribution unavailable for experiment variants.",
    };
  }
  if (!dataQuality.comparable) {
    return {
      allowStrongLearning: false,
      learningStatus: "insufficient_data",
      reason: "Variants are not fully comparable.",
    };
  }
  return {
    allowStrongLearning: true,
    learningStatus: "measured",
    reason: "Comparable measured outcomes with association.",
  };
}
