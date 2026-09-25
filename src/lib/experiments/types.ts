import type { ComparisonJson, MetricSnapshot } from "@/lib/learning/types";

export type ExperimentStatus =
  | "draft"
  | "review"
  | "approved"
  | "running"
  | "paused"
  | "completed"
  | "cancelled";

export type AllocationType = "manual" | "fixed_split";

export type VariantStatus = "draft" | "approved" | "active" | "completed" | "cancelled";

export type ExperimentResultClassification =
  | "positive_signal"
  | "negative_signal"
  | "mixed_signal"
  | "insufficient_data"
  | "inconclusive";

export type ExperimentConfidence = "high" | "medium" | "low";

export interface AllocationJson {
  version: 1;
  splits: Array<{ variantKey: string; percent: number }>;
  executionPlanId?: string | null;
  lastComparison?: VariantComparisonResult | null;
}

export type VariantObservedClassification =
  | "higher_observed_result"
  | "lower_observed_result"
  | "similar_observed_result"
  | "insufficient_data"
  | "unavailable";

export type ExperimentHealthStatus =
  | "draft"
  | "awaiting_review"
  | "ready"
  | "running"
  | "collecting_data"
  | "ready_to_measure"
  | "measured"
  | "incomplete"
  | "insufficient_data"
  | "completed";

export type EvidenceQualityLevel = "insufficient" | "limited" | "usable" | "strong";

export interface ExperimentHealthReport {
  status: ExperimentHealthStatus;
  readiness: string;
  blockers: string[];
  warnings: string[];
  measuredVariantCount: number;
  totalVariantCount: number;
  observationProgress: number | null;
  dataCompleteness: number | null;
}

export interface EvidenceQualityReport {
  level: EvidenceQualityLevel;
  summary: string;
  limitations: string[];
}

export interface VariantComparisonRow {
  variantId: string;
  variantKey: string;
  name: string;
  primaryMetricValue: number | null;
  baselineValue: number | null;
  outcomeValue: number | null;
  absoluteChange: number | null;
  percentChange: number | null;
  relativeDifference: number | null;
  observedClassification: VariantObservedClassification;
  sampleCount: number | null;
  availability: "measured" | "unavailable" | "insufficient_sample";
}

export interface VariantComparisonResult {
  version: 1;
  variants: VariantComparisonRow[];
  primaryMetric: string;
  metricChanges: Array<{ metric: string; note: string }>;
  sampleCounts: Record<string, number | null>;
  observationWindowDays: number;
  dataAvailability: "measured" | "unavailable" | "insufficient_sample";
  classification: ExperimentResultClassification;
  higherObservedVariantKey: string | null;
  limitations: string[];
  comparedAt: string;
}

export interface ExperimentInterpretationJson {
  version: 1;
  summary: string;
  observations: Array<{ kind: "measured" | "observed" | "interpreted"; text: string }>;
  possible_explanations: string[];
  limitations: string[];
  next_considerations: string[];
  confidence: ExperimentConfidence;
  interpretedAt?: string;
}

export interface ExperimentVariantRecord {
  id: string;
  experimentId: string;
  organizationId: string;
  clientWorkspaceId: string | null;
  name: string;
  description: string;
  variantKey: string;
  contentId: string | null;
  campaignId: string | null;
  scheduledPostId: string | null;
  executionPlanId: string | null;
  allocationPercent: number;
  baseline: MetricSnapshot;
  outcome: MetricSnapshot;
  result: Record<string, unknown>;
  status: VariantStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentIntelligenceInterpretation {
  version: 2;
  summary: string;
  observations: string[];
  interpretations: string[];
  limitations: string[];
  historical_context: string[];
  considerations: string[];
  interpretedAt?: string;
}

export interface RelatedExperimentRef {
  experimentId: string;
  name: string;
  reason: string;
  objective: string;
  platform: string | null;
  successMetric: string;
}

export type DataQualityStatus =
  | "unavailable"
  | "incomplete"
  | "limited"
  | "comparable"
  | "strong";

export interface DataQualityReport {
  status: DataQualityStatus;
  blockers: string[];
  warnings: string[];
  completeness: number | null;
  comparable: boolean;
}

export type AttributionStatus = "unavailable" | "limited" | "associated";

export interface AttributionReport {
  status: AttributionStatus;
  associations: string[];
  limitations: string[];
}

export interface ExperimentContextSnapshot {
  version: 1;
  frozenAt: string;
  objective: string;
  hypothesis: string;
  platform: string | null;
  successMetric: string;
  secondaryMetrics: string[];
  audienceContext: Record<string, unknown>;
  platformContext: Record<string, unknown>;
  contentContext: Record<string, unknown>;
  variants: Array<{
    variantKey: string;
    name: string;
    contentId: string | null;
    campaignId: string | null;
    scheduledPostId: string | null;
  }>;
}

export interface ExperimentMeasurementSnapshot {
  version: 1;
  idempotencyKey: string;
  measuredAt: string;
  observationWindowDays: number;
  primaryMetric: string;
  secondaryMetrics: string[];
  comparison: VariantComparisonResult;
  dataQuality: DataQualityReport;
  attribution: AttributionReport;
  limitations: string[];
  optimizationProposalId?: string | null;
  optimizationExecutionId?: string | null;
}

export interface ExperimentConflictFinding {
  topic: string;
  summary: string;
  experimentIds: string[];
  limitations: string[];
  conflict?: boolean;
  experiments?: Array<{ id: string; name: string; higherObservedVariantKey: string | null }>;
  commonContext?: string[];
  differingContext?: string[];
  explanation?: string;
}

export interface HistoricalExperimentEvidence {
  summary: string;
  totalCompleted: number;
  groups: Array<{
    label: string;
    experimentIds: string[];
    observedPattern: string;
  }>;
  mixed: boolean;
  limitations: string[];
}

export interface ExperimentIntelligenceSummary {
  experimentId: string;
  hypothesis: string;
  objective: string;
  primaryMetric: string;
  health: ExperimentHealthReport;
  evidenceQuality: EvidenceQualityReport;
  observationWindowDays: number;
  variantResults: VariantComparisonRow[];
  relatedExperiments: RelatedExperimentRef[];
  conflictingFindings: ExperimentConflictFinding[];
  dataQuality?: DataQualityReport;
  attribution?: AttributionReport;
  contextSnapshot?: ExperimentContextSnapshot | null;
  measurementSnapshot?: ExperimentMeasurementSnapshot | null;
  interpretation: ExperimentIntelligenceInterpretation | ExperimentInterpretationJson | Record<string, never>;
  limitations: string[];
  nextConsideration: string;
}

export interface ExperimentHistoryItem {
  id: string;
  name: string;
  objective: string;
  primaryMetric: string;
  platform: string | null;
  status: ExperimentStatus;
  evidenceQuality: EvidenceQualityLevel | null;
  observedSummary: string | null;
  endedAt: string | null;
  createdAt: string;
}

export interface ExperimentRecord {
  id: string;
  organizationId: string;
  clientWorkspaceId: string | null;
  createdBy: string;
  name: string;
  objective: string;
  hypothesis: string;
  platform: string | null;
  status: ExperimentStatus;
  allocationType: AllocationType;
  allocation: AllocationJson;
  successMetric: string;
  secondaryMetrics: string[];
  sampleTarget: number | null;
  minimumObservationDays: number;
  strategicPlanId: string | null;
  growthBriefId: string | null;
  interpretation:
    | ExperimentInterpretationJson
    | ExperimentIntelligenceInterpretation
    | Record<string, never>;
  audienceContext: Record<string, unknown>;
  platformContext: Record<string, unknown>;
  contentContext: Record<string, unknown>;
  readinessStatus: string | null;
  evidenceQuality: EvidenceQualityLevel | null;
  interpretationStatus: string;
  decisionNotes: string | null;
  relatedExperimentIds: string[];
  contextSnapshot: ExperimentContextSnapshot | Record<string, never>;
  measurementSnapshot: ExperimentMeasurementSnapshot | Record<string, never>;
  experimentEvaluation: import("@/lib/evaluation/experiment").ExperimentEvaluationDocument | Record<string, never>;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  variants?: ExperimentVariantRecord[];
}

export interface ExperimentDraftVariantInput {
  name: string;
  description?: string;
  variantKey: string;
  allocationPercent: number;
}

export interface ExperimentAiDraftOutput {
  name: string;
  objective: string;
  hypothesis: string;
  platform: string | null;
  successMetric: string;
  secondaryMetrics: string[];
  minimumObservationDays: number;
  sampleTarget: number | null;
  allocationType: AllocationType;
  variants: ExperimentDraftVariantInput[];
  suggestionsNote: string;
}
