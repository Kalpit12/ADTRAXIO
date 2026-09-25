export type OptimizationProposalType =
  | "allocation_change"
  | "content_selection"
  | "scheduling_change"
  | "campaign_setting_change";

export type OptimizationProposalStatus =
  | "draft"
  | "review"
  | "approved"
  | "expired"
  | "rejected"
  | "executed"
  | "rolled_back"
  | "cancelled";

export type EligibilityStatus =
  | "eligible"
  | "insufficient_evidence"
  | "conflicting_evidence"
  | "stale_evidence"
  | "unsupported_change"
  | "missing_baseline"
  | "missing_metric";

export type RiskLevel = "low" | "medium" | "high" | "blocked";

export interface EligibilityReport {
  status: EligibilityStatus;
  reasons: string[];
  supportingEvidence: string[];
  limitations: string[];
  evaluatedAt: string;
}

export interface RiskReport {
  level: RiskLevel;
  factors: string[];
  limitations: string[];
  requiresExtraConfirmation: boolean;
}

export interface SimulationPreview {
  currentState: Record<string, unknown>;
  proposedState: Record<string, unknown>;
  affectedResources: Array<{ type: string; id: string; label?: string }>;
  expectedDifference: string[];
  evidenceBasis: string[];
  limitations: string[];
}

export interface RollbackMetadata {
  previousState: Record<string, unknown>;
  proposedState: Record<string, unknown>;
  affectedResources: Array<{ type: string; id: string }>;
  capturedAt: string;
  actorId: string | null;
  sourceProposalId: string;
}

export type OptimizationAuditEvent =
  | "proposal_created"
  | "proposal_reviewed"
  | "proposal_approved"
  | "execution_started"
  | "execution_succeeded"
  | "execution_failed"
  | "rollback_started"
  | "rollback_succeeded"
  | "rollback_failed";

export interface OptimizationAuditEntry {
  at: string;
  actorId: string;
  previousStatus: OptimizationProposalStatus | null;
  newStatus: OptimizationProposalStatus;
  reason: string;
  event?: OptimizationAuditEvent;
  experimentId?: string;
  previousAllocation?: Record<string, number>;
  newAllocation?: Record<string, number>;
  result?: "success" | "failed" | "blocked";
  sourceEvidence?: string[];
  affectedResource?: string | null;
  workspaceId: string | null;
}

export type OptimizationOutcomeStatus = "pending_measurement" | "measured" | "failed";

export type OptimizationOutcomeLifecycleStatus =
  | "pending"
  | "measured"
  | "evaluated"
  | "inconclusive"
  | "insufficient_data";

export type OptimizationObservedClassification =
  | "higher_observed_result"
  | "lower_observed_result"
  | "similar_observed_result"
  | "insufficient_data"
  | "unavailable";

export interface OptimizationOutcomeBaseline {
  capturedAt: string;
  metric: string;
  variantValues: Record<string, number | null>;
  allocations: Record<string, number>;
}

export interface OptimizationOutcomeMeasured {
  capturedAt: string;
  metric: string;
  variantValues: Record<string, number | null>;
  allocations: Record<string, number>;
}

export interface OptimizationObservedDifference {
  metric: string;
  classification: OptimizationObservedClassification;
  absoluteDifference: Record<string, number | null>;
  relativeDifferencePercent: Record<string, number | null>;
  observationWindowDays: number;
  limitations: string[];
}

export interface OptimizationOutcomeRecord {
  optimizationProposalId: string;
  optimizationExecutionId: string;
  experimentId: string;
  executedAt: string;
  previousAllocation: Record<string, number>;
  executedAllocation: Record<string, number>;
  measurementWindow: {
    startedAt: string;
    days: number;
    endedAt?: string | null;
  };
  baseline: OptimizationOutcomeBaseline;
  outcome?: OptimizationOutcomeMeasured;
  observedDifference?: OptimizationObservedDifference;
  evidenceQuality?: string | null;
  attributionStatus?: string | null;
  status: OptimizationOutcomeLifecycleStatus;
  limitations: string[];
  measuredAt?: string | null;
  evaluatedAt?: string | null;
  idempotencyKey: string;
  learningOutcomeKeys?: string[];
  executionSummary?: string;
  outcomeSummary?: string;
}

export interface OptimizationExecutionRecord {
  id: string;
  proposalId: string;
  experimentId: string;
  status: OptimizationOutcomeStatus;
  message: string;
  previousAllocation: Record<string, number>;
  executedAllocation: Record<string, number>;
  executedAt: string;
  executedBy: string;
  rolledBackAt?: string | null;
  rolledBackBy?: string | null;
}

export interface OptimizationProposalRecord {
  id: string;
  organizationId: string;
  clientWorkspaceId: string | null;
  createdBy: string;
  sourceType: string;
  sourceId: string;
  proposalType: OptimizationProposalType;
  objective: string;
  status: OptimizationProposalStatus;
  currentState: Record<string, unknown>;
  proposedState: Record<string, unknown>;
  projectedState: Record<string, unknown>;
  evidence: Record<string, unknown>;
  eligibility: EligibilityReport;
  risk: RiskReport;
  simulation: SimulationPreview;
  limitations: string[];
  rollbackState: RollbackMetadata | Record<string, never>;
  auditLog: OptimizationAuditEntry[];
  approvedBy: string | null;
  approvedAt: string | null;
  expiresAt: string;
  executedAt: string | null;
  executionId: string | null;
  execution: OptimizationExecutionRecord | null;
  outcome: OptimizationOutcomeRecord | null;
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OptimizationOpportunity {
  type: OptimizationProposalType;
  sourceType: string;
  sourceId: string;
  evidence: string[];
  eligibility: EligibilityStatus;
  rationale: string;
  limitations: string[];
}
