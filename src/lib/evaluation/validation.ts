import type {
  AttributionJson,
  EvaluationConfidence,
  EvaluationInterpretationJson,
  ResultClassification,
} from "./types";

export class EvaluationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvaluationValidationError";
  }
}

const CONFIDENCE = new Set<EvaluationConfidence>(["high", "medium", "low"]);
const CLASSIFICATION = new Set<ResultClassification>([
  "positive_signal",
  "negative_signal",
  "mixed_signal",
  "insufficient_data",
  "inconclusive",
]);

export function validateEvaluationInterpretation(
  raw: unknown
): EvaluationInterpretationJson {
  if (!raw || typeof raw !== "object") {
    throw new EvaluationValidationError("Invalid evaluation JSON.");
  }
  const obj = raw as Record<string, unknown>;
  const confidence = String(obj.confidence ?? "low") as EvaluationConfidence;
  const resultClassification = String(
    obj.resultClassification ?? "inconclusive"
  ) as ResultClassification;

  if (!CONFIDENCE.has(confidence)) {
    throw new EvaluationValidationError("Invalid confidence.");
  }
  if (!CLASSIFICATION.has(resultClassification)) {
    throw new EvaluationValidationError("Invalid result classification.");
  }

  return {
    version: 1,
    summary: String(obj.summary ?? "").slice(0, 2000),
    objectiveResult: String(obj.objectiveResult ?? "").slice(0, 1000),
    resultClassification,
    whatWorked: Array.isArray(obj.whatWorked)
      ? obj.whatWorked.map((s) => String(s).slice(0, 500)).slice(0, 8)
      : [],
    whatUnderperformed: Array.isArray(obj.whatUnderperformed)
      ? obj.whatUnderperformed.map((s) => String(s).slice(0, 500)).slice(0, 8)
      : [],
    unexpectedResults: Array.isArray(obj.unexpectedResults)
      ? obj.unexpectedResults.map((s) => String(s).slice(0, 500)).slice(0, 6)
      : [],
    limitations: Array.isArray(obj.limitations)
      ? obj.limitations.map((s) => String(s).slice(0, 500)).slice(0, 8)
      : [],
    confidence,
    futureConsiderations: Array.isArray(obj.futureConsiderations)
      ? obj.futureConsiderations.map((s) => String(s).slice(0, 500)).slice(0, 6)
      : [],
    interpretedAt: new Date().toISOString(),
  };
}

export function validateExperimentEvaluationInterpretation(
  raw: unknown
): import("./experiment").ExperimentEvaluationInterpretation {
  if (!raw || typeof raw !== "object") {
    throw new EvaluationValidationError("Invalid experiment evaluation JSON.");
  }
  const obj = raw as Record<string, unknown>;
  const forbidden = /\b(winner|statistical significance|caused|causation proved)\b/i;
  const strings = [
    String(obj.summary ?? ""),
    ...(Array.isArray(obj.observations) ? obj.observations.map(String) : []),
    ...(Array.isArray(obj.interpretations) ? obj.interpretations.map(String) : []),
  ];
  if (strings.some((s) => forbidden.test(s))) {
    throw new EvaluationValidationError("Forbidden evaluation language.");
  }
  return {
    version: 1,
    summary: String(obj.summary ?? "").slice(0, 2000),
    observations: Array.isArray(obj.observations)
      ? obj.observations.map((s) => String(s).slice(0, 500)).slice(0, 10)
      : [],
    interpretations: Array.isArray(obj.interpretations)
      ? obj.interpretations.map((s) => String(s).slice(0, 500)).slice(0, 8)
      : [],
    limitations: Array.isArray(obj.limitations)
      ? obj.limitations.map((s) => String(s).slice(0, 500)).slice(0, 8)
      : [],
    considerations: Array.isArray(obj.considerations)
      ? obj.considerations.map((s) => String(s).slice(0, 500)).slice(0, 8)
      : [],
    interpretedAt: new Date().toISOString(),
  };
}

export function validateAttribution(raw: unknown): AttributionJson {
  if (!raw || typeof raw !== "object") {
    return {
      version: 1,
      level: "insufficient_evidence",
      evidence: [],
      limitations: [],
    };
  }
  const obj = raw as Record<string, unknown>;
  const level = String(obj.level ?? "insufficient_evidence");
  const allowed = [
    "direct_evidence",
    "supporting_evidence",
    "correlation_only",
    "insufficient_evidence",
  ];
  return {
    version: 1,
    level: (allowed.includes(level) ? level : "insufficient_evidence") as AttributionJson["level"],
    evidence: Array.isArray(obj.evidence)
      ? obj.evidence.map((e) => String(e).slice(0, 500)).slice(0, 8)
      : [],
    limitations: Array.isArray(obj.limitations)
      ? obj.limitations.map((e) => String(e).slice(0, 500)).slice(0, 8)
      : [],
  };
}
