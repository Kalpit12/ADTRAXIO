import type { ExperimentAiDraftOutput, ExperimentDraftVariantInput } from "./types";

export class ExperimentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExperimentValidationError";
  }
}

export function validateVariantInputs(variants: ExperimentDraftVariantInput[]): void {
  if (variants.length < 2) {
    throw new ExperimentValidationError("At least two variants are required.");
  }
  const keys = new Set<string>();
  for (const v of variants) {
    const key = v.variantKey.trim().toUpperCase();
    if (!key) throw new ExperimentValidationError("variant_key is required.");
    if (keys.has(key)) {
      throw new ExperimentValidationError(`Duplicate variant_key: ${key}`);
    }
    keys.add(key);
    if (!v.name.trim()) throw new ExperimentValidationError("Variant name is required.");
  }
}

export function validateAiDraft(raw: unknown): ExperimentAiDraftOutput {
  if (!raw || typeof raw !== "object") {
    throw new ExperimentValidationError("Invalid experiment draft JSON.");
  }
  const obj = raw as Record<string, unknown>;
  const variantsRaw = Array.isArray(obj.variants) ? obj.variants : [];
  const variants: ExperimentDraftVariantInput[] = variantsRaw.map((v, i) => {
    const row = v as Record<string, unknown>;
    return {
      name: String(row.name ?? `Variant ${i + 1}`).slice(0, 200),
      description: String(row.description ?? "").slice(0, 2000),
      variantKey: String(row.variantKey ?? row.variant_key ?? `V${i + 1}`)
        .trim()
        .toUpperCase()
        .slice(0, 32),
      allocationPercent: Number(row.allocationPercent ?? row.allocation_percent ?? 50),
    };
  });
  validateVariantInputs(variants);

  const allocationType = String(obj.allocationType ?? "fixed_split");
  if (allocationType !== "manual" && allocationType !== "fixed_split") {
    throw new ExperimentValidationError("Invalid allocation type.");
  }

  return {
    name: String(obj.name ?? "Experiment draft").slice(0, 200),
    objective: String(obj.objective ?? "").slice(0, 1000),
    hypothesis: String(obj.hypothesis ?? "").slice(0, 2000),
    platform: obj.platform ? String(obj.platform).slice(0, 64) : null,
    successMetric: String(obj.successMetric ?? "engagement").slice(0, 64),
    secondaryMetrics: Array.isArray(obj.secondaryMetrics)
      ? obj.secondaryMetrics.map((m) => String(m).slice(0, 64)).slice(0, 8)
      : [],
    minimumObservationDays: Math.min(
      90,
      Math.max(3, Number(obj.minimumObservationDays ?? 14))
    ),
    sampleTarget: obj.sampleTarget != null ? Number(obj.sampleTarget) : null,
    allocationType,
    variants,
    suggestionsNote: String(
      obj.suggestionsNote ?? "AI-suggested draft. Review before approval."
    ).slice(0, 500),
  };
}

export function validateInterpretation(raw: unknown): import("./types").ExperimentInterpretationJson {
  if (!raw || typeof raw !== "object") {
    throw new ExperimentValidationError("Invalid interpretation JSON.");
  }
  const obj = raw as Record<string, unknown>;
  const confidence = String(obj.confidence ?? "low");
  const allowed = new Set(["high", "medium", "low"]);
  return {
    version: 1,
    summary: String(obj.summary ?? "").slice(0, 2000),
    observations: Array.isArray(obj.observations)
      ? obj.observations.map((o) => {
          const item = o as Record<string, unknown>;
          const kind = String(item.kind ?? "observed");
          return {
            kind: (kind === "measured" || kind === "interpreted" ? kind : "observed") as
              | "measured"
              | "observed"
              | "interpreted",
            text: String(item.text ?? "").slice(0, 500),
          };
        }).slice(0, 12)
      : [],
    possible_explanations: Array.isArray(obj.possible_explanations)
      ? obj.possible_explanations.map((s) => String(s).slice(0, 500)).slice(0, 8)
      : [],
    limitations: Array.isArray(obj.limitations)
      ? obj.limitations.map((s) => String(s).slice(0, 500)).slice(0, 8)
      : [],
    next_considerations: Array.isArray(obj.next_considerations)
      ? obj.next_considerations.map((s) => String(s).slice(0, 500)).slice(0, 8)
      : [],
    confidence: (allowed.has(confidence) ? confidence : "low") as import("./types").ExperimentConfidence,
    interpretedAt: new Date().toISOString(),
  };
}

export function validateIntelligenceInterpretation(
  raw: unknown
): import("./types").ExperimentIntelligenceInterpretation {
  if (!raw || typeof raw !== "object") {
    throw new ExperimentValidationError("Invalid intelligence interpretation JSON.");
  }
  const obj = raw as Record<string, unknown>;
  return {
    version: 2,
    summary: String(obj.summary ?? "").slice(0, 2000),
    observations: Array.isArray(obj.observations)
      ? obj.observations.map((s) => String(s).slice(0, 500)).slice(0, 12)
      : [],
    interpretations: Array.isArray(obj.interpretations)
      ? obj.interpretations.map((s) => String(s).slice(0, 500)).slice(0, 8)
      : [],
    limitations: Array.isArray(obj.limitations)
      ? obj.limitations.map((s) => String(s).slice(0, 500)).slice(0, 8)
      : [],
    historical_context: Array.isArray(obj.historical_context)
      ? obj.historical_context.map((s) => String(s).slice(0, 500)).slice(0, 8)
      : [],
    considerations: Array.isArray(obj.considerations)
      ? obj.considerations.map((s) => String(s).slice(0, 500)).slice(0, 8)
      : [],
    interpretedAt: new Date().toISOString(),
  };
}
