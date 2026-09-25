import type {
  GrowthConfidence,
  GrowthInsight,
  GrowthInsightSeverity,
  GrowthInsightType,
  GrowthRecommendation,
  GrowthRecommendationActionType,
  ValidatedBriefOutput,
} from "./types";

export class GrowthBriefValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GrowthBriefValidationError";
  }
}

const INSIGHT_TYPES: GrowthInsightType[] = [
  "performance_change",
  "content_pattern",
  "campaign_change",
  "publishing_issue",
  "growth_opportunity",
  "consistency_issue",
  "platform_change",
  "recommendation",
];

const SEVERITIES: GrowthInsightSeverity[] = ["info", "attention", "important"];
const CONFIDENCE: GrowthConfidence[] = ["high", "medium", "low"];
const ACTION_TYPES: GrowthRecommendationActionType[] = [
  "create_content",
  "create_strategy",
  "review_campaign",
  "review_scheduled_posts",
  "create_report",
  "repurpose_content",
];

export function sanitizeDisplayText(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map(sanitizeDisplayText);
}

export function validateBriefOutput(raw: unknown): ValidatedBriefOutput {
  if (!raw || typeof raw !== "object") {
    throw new GrowthBriefValidationError("AI returned invalid JSON.");
  }
  const payload = raw as Record<string, unknown>;
  if (!isString(payload.summary)) {
    throw new GrowthBriefValidationError("Summary is required.");
  }

  const insightsRaw = Array.isArray(payload.insights) ? payload.insights : [];
  const insights: GrowthInsight[] = [];
  for (const item of insightsRaw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (!isString(row.title) || !isString(row.observation)) continue;
    const type = INSIGHT_TYPES.includes(row.type as GrowthInsightType)
      ? (row.type as GrowthInsightType)
      : "recommendation";
    const severity = SEVERITIES.includes(row.severity as GrowthInsightSeverity)
      ? (row.severity as GrowthInsightSeverity)
      : "info";
    const confidence = CONFIDENCE.includes(row.confidence as GrowthConfidence)
      ? (row.confidence as GrowthConfidence)
      : "medium";
    insights.push({
      type,
      title: sanitizeDisplayText(row.title),
      observation: sanitizeDisplayText(row.observation),
      evidence: stringArray(row.evidence),
      severity,
      confidence,
    });
  }

  const recsRaw = Array.isArray(payload.recommendations)
    ? payload.recommendations
    : [];
  const recommendations: GrowthRecommendation[] = [];
  for (const item of recsRaw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (!isString(row.title) || !isString(row.reason)) continue;
    const actionType = ACTION_TYPES.includes(
      row.actionType as GrowthRecommendationActionType
    )
      ? (row.actionType as GrowthRecommendationActionType)
      : "create_content";
    const priority =
      row.priority === "high" || row.priority === "low" ? row.priority : "medium";
    recommendations.push({
      title: sanitizeDisplayText(row.title),
      reason: sanitizeDisplayText(row.reason),
      evidence: stringArray(row.evidence),
      actionType,
      priority,
    });
  }

  return {
    summary: sanitizeDisplayText(payload.summary),
    insights,
    recommendations,
  };
}
