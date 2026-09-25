export type ExecutionPlanStatus =
  | "draft"
  | "review"
  | "approved"
  | "executing"
  | "completed"
  | "partially_completed"
  | "failed"
  | "cancelled";

export type ExecutionStepType =
  | "analyze"
  | "create_content"
  | "create_campaign"
  | "prepare_schedule"
  | "publish"
  | "schedule"
  | "create_report"
  | "repurpose_content";

export type ExecutionStepStatus =
  | "pending"
  | "processing"
  | "ready"
  | "approved"
  | "executing"
  | "completed"
  | "failed"
  | "skipped"
  | "needs_review";

export interface ExecutionStepResult {
  contentIds?: string[];
  campaignId?: string;
  scheduleItems?: Array<{
    contentId: string;
    socialAccountId: string;
    platform: string;
    scheduledFor: string;
    timezone: string;
    caption?: string;
    scheduledPostId?: string;
  }>;
  message?: string;
}

export interface ExecutionPlanStep {
  id: string;
  type: ExecutionStepType;
  title: string;
  status: ExecutionStepStatus;
  input: Record<string, unknown>;
  result?: ExecutionStepResult;
  requiresConfirmation: boolean;
  approved: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
  executedAt?: string | null;
  error?: string | null;
}

export interface ExecutionAuditEntry {
  at: string;
  actorId: string;
  action: string;
  stepId?: string;
  detail?: string;
  success?: boolean;
  error?: string;
}

export interface ExecutionPlanJson {
  version: 1;
  rationale: string;
  evidence: string[];
  source?: {
    growthBriefId?: string;
    recommendationIndex?: number;
    recommendationTitle?: string;
  };
  steps: ExecutionPlanStep[];
  auditLog?: ExecutionAuditEntry[];
}

export interface ExecutionPlanRecord {
  id: string;
  organizationId: string;
  clientWorkspaceId: string | null;
  createdBy: string;
  growthBriefId: string | null;
  title: string;
  objective: string;
  status: ExecutionPlanStatus;
  plan: ExecutionPlanJson;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

export const PREPARABLE_ACTION_TYPES = new Set([
  "create_content",
  "repurpose_content",
  "review_campaign",
  "review_scheduled_posts",
]);

export const PLAN_TTL_DAYS = 7;
