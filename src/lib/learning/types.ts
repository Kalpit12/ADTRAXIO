export type LearningOutcomeStatus =
  | "pending"
  | "measuring"
  | "measured"
  | "insufficient_data"
  | "failed";

export type LearningConfidence = "high" | "medium" | "low";

export type LearningSourceType =
  | "execution_step"
  | "execution_plan"
  | "strategic_plan"
  | "content"
  | "campaign"
  | "scheduled_post";

export type MetricAvailability = "measured" | "unavailable" | "insufficient_sample";

export interface MetricSnapshot {
  capturedAt: string;
  windowDays: number;
  impressions: number | null;
  reach: number | null;
  engagement: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  views: number | null;
  postsPublished: number | null;
  publishingFrequencyPerWeek: number | null;
  campaignActiveCount: number | null;
  notes?: string[];
}

export interface MetricComparisonRow {
  metric: string;
  baseline: number | null;
  outcome: number | null;
  absoluteChange: number | null;
  percentChange: number | null;
  availability: MetricAvailability;
}

export interface ComparisonJson {
  version: 1;
  rows: MetricComparisonRow[];
  overallAvailability: MetricAvailability;
  summaryNote?: string;
}

export interface LearningInsightItem {
  statement: string;
  evidence: string[];
  confidence: LearningConfidence;
  applicableTo: string;
  kind: "measured" | "observed" | "interpreted" | "learning";
}

export interface LearningInterpretationJson {
  version: 1;
  summary: string;
  whatWorked: string[];
  whatDidNotWork: string[];
  observations: Array<{ kind: string; text: string }>;
  learnings: LearningInsightItem[];
  confidence: LearningConfidence;
  nextConsiderations: string[];
  interpretedAt?: string;
}

export interface LearningAuditEntry {
  at: string;
  action: string;
  detail?: string;
}

export interface LearningOutcomeRecord {
  id: string;
  organizationId: string;
  clientWorkspaceId: string | null;
  strategicPlanId: string | null;
  executionPlanId: string | null;
  executionStepId: string | null;
  sourceType: LearningSourceType;
  sourceId: string | null;
  platform: string | null;
  contentId: string | null;
  campaignId: string | null;
  scheduledPostId: string | null;
  objective: string;
  idempotencyKey: string;
  baseline: MetricSnapshot;
  outcome: MetricSnapshot;
  comparison: ComparisonJson;
  learning: LearningInterpretationJson | Record<string, never>;
  confidence: LearningConfidence;
  status: LearningOutcomeStatus;
  measureAfter: string;
  measuredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const OUTCOME_WINDOW_DAYS = {
  content: 7,
  post: 7,
  campaign: 14,
  strategic_plan: 14,
  execution_plan: 14,
  default: 7,
} as const;
