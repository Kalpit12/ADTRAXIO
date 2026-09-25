export type EvidenceSourceType =
  | "experiment"
  | "experiment_variant"
  | "experiment_evaluation"
  | "learning_outcome"
  | "strategic_plan"
  | "content"
  | "campaign"
  | "platform";

export type EvidenceRelationshipType =
  | "tests"
  | "uses"
  | "measures"
  | "produces"
  | "informs"
  | "related_to";

export type ObservedPatternClassification =
  | "consistent_observed_pattern"
  | "mixed_observed_pattern"
  | "insufficient_evidence"
  | "unavailable";

export interface EvidenceRecord {
  sourceType: EvidenceSourceType;
  sourceId: string;
  workspaceId: string | null;
  experimentId: string | null;
  experimentVariantId: string | null;
  evaluationId: string | null;
  learningOutcomeId: string | null;
  strategicPlanId: string | null;
  contentId: string | null;
  campaignId: string | null;
  platform: string | null;
  metric: string | null;
  objective: string | null;
  contentType: string | null;
  audienceContext: Record<string, unknown> | null;
  observedResult: string | null;
  higherObservedVariantKey: string | null;
  evidenceQuality: string | null;
  attributionStatus: string | null;
  observationWindowDays: number | null;
  limitations: string[];
  createdAt: string;
}

export interface EvidenceRelationship {
  type: EvidenceRelationshipType;
  from: { type: EvidenceSourceType; id: string };
  to: { type: EvidenceSourceType; id: string };
  label: string;
}

export interface EvidenceGraph {
  records: EvidenceRecord[];
  relationships: EvidenceRelationship[];
  limitations: string[];
}

export interface CrossExperimentObservation {
  experimentId: string;
  experimentName: string;
  platform: string | null;
  metric: string;
  objective: string;
  higherObservedVariantKey: string | null;
  observationWindowDays: number | null;
  evidenceQuality: string | null;
  attributionStatus: string | null;
  endedAt: string | null;
  trace: {
    experimentId: string;
    evaluationId: string | null;
    learningOutcomeIds: string[];
  };
}

export interface CrossExperimentEvidenceResult {
  classification: ObservedPatternClassification;
  summary: string;
  sampleCount: number;
  groupingKey: string;
  supportingObservations: CrossExperimentObservation[];
  conflictingObservations: CrossExperimentObservation[];
  observationWindows: number[];
  limitations: string[];
  traceability: Array<{
    experimentId: string;
    evaluationId: string | null;
    learningOutcomeId: string | null;
  }>;
}

export interface EvidenceConflictDetail {
  commonContext: string[];
  supportingExperiments: Array<{ id: string; name: string }>;
  conflictingExperiments: Array<{ id: string; name: string }>;
  differences: string[];
  limitations: string[];
}

export interface CrossExperimentLearningLink {
  learningOutcomeId: string;
  experimentId: string;
  experimentVariantId: string | null;
  metric: string | null;
  objective: string;
  platform: string | null;
  status: string;
  evidenceQuality: string | null;
  attributionStatus: string | null;
  observationWindowDays: number | null;
  limitations: string[];
  strategicPlanId: string | null;
}

export interface CrossExperimentLearningsResult {
  summary: string;
  links: CrossExperimentLearningLink[];
  limitations: string[];
}

export interface CrossExperimentInterpretation {
  version: 1;
  summary: string;
  observations: string[];
  interpretations: string[];
  conflicts: string[];
  limitations: string[];
  considerations: string[];
  interpretedAt?: string;
}
