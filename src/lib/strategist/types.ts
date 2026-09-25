import type { ExecutionStepType } from "@/lib/execution/types";
import type { OptimizationOpportunity } from "@/lib/optimization/types";

export type StrategyType =
  | "content_growth"
  | "engagement_recovery"
  | "audience_growth"
  | "campaign_push"
  | "consistency"
  | "performance_optimization"
  | "custom";

export type StrategicPlanStatus =
  | "draft"
  | "prepared"
  | "review"
  | "approved"
  | "executing"
  | "completed"
  | "partially_completed"
  | "failed"
  | "cancelled"
  | "expired";

export type ConfidenceLevel = "high" | "medium" | "low";

export const ALLOWED_STRATEGIC_ACTION_TYPES = new Set<
  ExecutionStepType
>([
  "create_content",
  "repurpose_content",
  "create_campaign",
  "prepare_schedule",
  "create_report",
]);

export interface StrategicEvidenceItem {
  metric: string;
  value: string;
  period: string;
  source: string;
  interpretation: "measured" | "observed" | "interpreted" | "recommended";
}

export interface StrategicInsight {
  kind: "measured" | "observed" | "interpreted" | "recommended";
  title: string;
  body: string;
}

export interface StrategicAction {
  id: string;
  title: string;
  reason: string;
  evidence: string[];
  priority: "high" | "medium" | "low";
  confidence: ConfidenceLevel;
  type: ExecutionStepType;
  platform?: string | null;
  target?: string | null;
  instructions?: string | null;
  input?: Record<string, unknown>;
  reviewStatus: "pending" | "approved" | "rejected";
}

export interface StrategicAlternative {
  label: string;
  summary: string;
  actions: StrategicAction[];
}

export interface StrategicAuditEntry {
  at: string;
  actorId: string;
  action: string;
  detail?: string;
}

export interface StrategicAdaptation {
  learningId: string | null;
  learning: string;
  relevance: string;
  application: string;
  confidence: ConfidenceLevel;
  adaptationType: string;
}

export interface StrategicHistoricalEvidenceRef {
  learningId: string;
  summary: string;
  recency: string;
  sampleContext?: string;
}

export interface StrategicAdaptiveBlock {
  currentSituation: string;
  historicalEvidence: StrategicHistoricalEvidenceRef[];
  adaptations: StrategicAdaptation[];
  learningIds: string[];
  evidenceSummary: string;
  mixedEvidenceNote?: string;
}

export interface StrategicPlanJson {
  version: 1;
  summary: string;
  insights: StrategicInsight[];
  actions: StrategicAction[];
  alternatives?: StrategicAlternative[];
  growthBriefId?: string | null;
  executionPlanId?: string | null;
  adaptive?: StrategicAdaptiveBlock;
  optimizationOpportunities?: OptimizationOpportunity[];
  auditLog?: StrategicAuditEntry[];
}

export interface StrategicPlanCreateMeta {
  learningCount: number;
  adaptationCount: number;
  learningIds: string[];
}

export interface StrategicPlanRecord {
  id: string;
  organizationId: string;
  clientWorkspaceId: string | null;
  createdBy: string;
  objective: string;
  strategyType: StrategyType;
  status: StrategicPlanStatus;
  plan: StrategicPlanJson;
  evidence: StrategicEvidenceItem[];
  confidence: ConfidenceLevel;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

export const STRATEGIC_PLAN_TTL_DAYS = 7;

export interface AiStrategicPlanOutput {
  objective: string;
  summary: string;
  strategyType: StrategyType;
  confidence: ConfidenceLevel;
  evidence: StrategicEvidenceItem[];
  insights: Array<{
    kind: StrategicInsight["kind"];
    title: string;
    body: string;
  }>;
  actions: Array<{
    title: string;
    reason: string;
    evidence: string[];
    priority: "high" | "medium" | "low";
    confidence: ConfidenceLevel;
    type: string;
    platform?: string;
    target?: string;
    instructions?: string;
    input?: Record<string, unknown>;
  }>;
  alternatives?: Array<{
    label: string;
    summary: string;
    actions: AiStrategicPlanOutput["actions"];
  }>;
  currentSituation?: string;
  historicalEvidence?: Array<{
    learningId?: string;
    summary?: string;
    recency?: string;
    sampleContext?: string;
  }>;
  adaptations?: Array<{
    learning?: string;
    learningId?: string;
    relevance?: string;
    application?: string;
    confidence?: ConfidenceLevel;
    adaptationType?: string;
  }>;
  mixedEvidenceNote?: string;
}
