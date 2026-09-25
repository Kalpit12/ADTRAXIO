import type { ComparisonJson, MetricSnapshot } from "@/lib/learning/types";

export type EvaluationStatus =
  | "pending"
  | "measuring"
  | "evaluated"
  | "insufficient_data"
  | "inconclusive"
  | "failed";

export type EvaluationConfidence = "high" | "medium" | "low";

export type StrategyObjectiveKind =
  | "awareness"
  | "engagement"
  | "leads"
  | "sales"
  | "traffic"
  | "app_installs"
  | "growth"
  | "consistency";

export type ResultClassification =
  | "positive_signal"
  | "negative_signal"
  | "mixed_signal"
  | "insufficient_data"
  | "inconclusive";

export type AttributionLevel =
  | "direct_evidence"
  | "supporting_evidence"
  | "correlation_only"
  | "insufficient_evidence";

export interface AttributionJson {
  version: 1;
  level: AttributionLevel;
  evidence: string[];
  limitations: string[];
}

export interface EvaluationInterpretationJson {
  version: 1;
  summary: string;
  objectiveResult: string;
  resultClassification: ResultClassification;
  whatWorked: string[];
  whatUnderperformed: string[];
  unexpectedResults: string[];
  limitations: string[];
  confidence: EvaluationConfidence;
  futureConsiderations: string[];
  interpretedAt?: string;
}

export interface StrategyEvaluationRecord {
  id: string;
  organizationId: string;
  clientWorkspaceId: string | null;
  strategicPlanId: string;
  executionPlanId: string | null;
  objective: StrategyObjectiveKind;
  idempotencyKey: string;
  status: EvaluationStatus;
  baseline: MetricSnapshot;
  outcome: MetricSnapshot;
  comparison: ComparisonJson;
  attribution: AttributionJson;
  evaluation: EvaluationInterpretationJson | Record<string, never>;
  confidence: EvaluationConfidence;
  experimentId: string | null;
  variantId: string | null;
  experimentLabel: string | null;
  measureAfter: string;
  measuredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const EVALUATION_WINDOW_DAYS = 14;
