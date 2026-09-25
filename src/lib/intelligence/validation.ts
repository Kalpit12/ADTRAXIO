import {
  CONFIDENCE_LEVELS,
  PRIORITY_LEVELS,
  RECOMMENDATION_STATUSES,
  RECOMMENDATION_TYPES,
} from "./constants";
import type {
  AIGenerationOutput,
  ConfidenceLevel,
  PriorityLevel,
  RecommendationStatus,
  RecommendationType,
} from "./types";

export class IntelligenceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntelligenceValidationError";
  }
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

function parseConfidence(value: unknown): ConfidenceLevel {
  if (
    typeof value === "string" &&
    CONFIDENCE_LEVELS.includes(value as ConfidenceLevel)
  ) {
    return value as ConfidenceLevel;
  }
  return "low";
}

function parsePriority(value: unknown): PriorityLevel {
  if (
    typeof value === "string" &&
    PRIORITY_LEVELS.includes(value as PriorityLevel)
  ) {
    return value as PriorityLevel;
  }
  return "medium";
}

function parseType(value: unknown): RecommendationType {
  if (
    typeof value === "string" &&
    RECOMMENDATION_TYPES.includes(value as RecommendationType)
  ) {
    return value as RecommendationType;
  }
  return "growth";
}

export function sanitizeDisplayText(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();
}

export function validateAIGenerationOutput(raw: unknown): AIGenerationOutput {
  if (!raw || typeof raw !== "object") {
    throw new IntelligenceValidationError("AI returned invalid JSON structure.");
  }

  const payload = raw as Record<string, unknown>;

  if (!isString(payload.summary)) {
    throw new IntelligenceValidationError("AI summary is missing.");
  }

  const insightsRaw = Array.isArray(payload.insights) ? payload.insights : [];
  const recommendationsRaw = Array.isArray(payload.recommendations)
    ? payload.recommendations
    : [];

  const insights = insightsRaw.slice(0, 4).map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new IntelligenceValidationError(`Insight ${index + 1} is invalid.`);
    }
    const insight = item as Record<string, unknown>;
    if (!isString(insight.title) || !isString(insight.observation)) {
      throw new IntelligenceValidationError(`Insight ${index + 1} is incomplete.`);
    }

    return {
      title: sanitizeDisplayText(insight.title),
      observation: sanitizeDisplayText(insight.observation),
      evidence: isStringArray(insight.evidence) ? insight.evidence.map(sanitizeDisplayText) : [],
      confidence: parseConfidence(insight.confidence),
      type: parseType(insight.type),
    };
  });

  const recommendations = recommendationsRaw.slice(0, 4).map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new IntelligenceValidationError(`Recommendation ${index + 1} is invalid.`);
    }
    const rec = item as Record<string, unknown>;
    if (!isString(rec.title) || !isString(rec.action) || !isString(rec.reason)) {
      throw new IntelligenceValidationError(
        `Recommendation ${index + 1} is incomplete.`
      );
    }

    return {
      title: sanitizeDisplayText(rec.title),
      action: sanitizeDisplayText(rec.action),
      reason: sanitizeDisplayText(rec.reason),
      evidence: isStringArray(rec.evidence) ? rec.evidence.map(sanitizeDisplayText) : [],
      priority: parsePriority(rec.priority),
      type: parseType(rec.type),
    };
  });

  return {
    summary: sanitizeDisplayText(payload.summary),
    insights,
    recommendations,
  };
}

export function validateRecommendationStatus(status: unknown): RecommendationStatus {
  if (
    typeof status === "string" &&
    RECOMMENDATION_STATUSES.includes(status as RecommendationStatus)
  ) {
    return status as RecommendationStatus;
  }
  throw new IntelligenceValidationError("Invalid recommendation status.");
}
