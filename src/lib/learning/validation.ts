import type { LearningInterpretationJson, LearningConfidence } from "./types";

const CONFIDENCE = new Set<LearningConfidence>(["high", "medium", "low"]);

export class LearningValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LearningValidationError";
  }
}

export function validateLearningInterpretation(raw: unknown): LearningInterpretationJson {
  if (!raw || typeof raw !== "object") {
    throw new LearningValidationError("Invalid learning interpretation JSON.");
  }
  const obj = raw as Record<string, unknown>;
  const confidence = String(obj.confidence ?? "low") as LearningConfidence;
  if (!CONFIDENCE.has(confidence)) {
    throw new LearningValidationError("Invalid confidence.");
  }

  return {
    version: 1,
    summary: String(obj.summary ?? "").slice(0, 2000),
    whatWorked: Array.isArray(obj.whatWorked)
      ? obj.whatWorked.map((s) => String(s).slice(0, 500)).slice(0, 8)
      : [],
    whatDidNotWork: Array.isArray(obj.whatDidNotWork)
      ? obj.whatDidNotWork.map((s) => String(s).slice(0, 500)).slice(0, 8)
      : [],
    observations: Array.isArray(obj.observations)
      ? obj.observations
          .filter((o) => o && typeof o === "object")
          .map((o) => {
            const row = o as Record<string, unknown>;
            return {
              kind: String(row.kind ?? "observed"),
              text: String(row.text ?? "").slice(0, 800),
            };
          })
          .slice(0, 12)
      : [],
    learnings: Array.isArray(obj.learnings)
      ? obj.learnings
          .filter((l) => l && typeof l === "object")
          .map((l) => {
            const row = l as Record<string, unknown>;
            const c = String(row.confidence ?? "low") as LearningConfidence;
            return {
              statement: String(row.statement ?? "").slice(0, 600),
              evidence: Array.isArray(row.evidence)
                ? row.evidence.map((e) => String(e).slice(0, 300)).slice(0, 6)
                : [],
              confidence: CONFIDENCE.has(c) ? c : "low",
              applicableTo: String(row.applicableTo ?? "general").slice(0, 120),
              kind: (["measured", "observed", "interpreted", "learning"].includes(
                String(row.kind)
              )
                ? String(row.kind)
                : "learning") as "measured" | "observed" | "interpreted" | "learning",
            };
          })
          .slice(0, 10)
      : [],
    confidence,
    nextConsiderations: Array.isArray(obj.nextConsiderations)
      ? obj.nextConsiderations.map((s) => String(s).slice(0, 400)).slice(0, 6)
      : [],
    interpretedAt: new Date().toISOString(),
  };
}
