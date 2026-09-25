import type { APPROVAL_STATUSES, ACTIVITY_ACTIONS, NOTIFICATION_TYPES } from "./constants";

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface ApprovalRecord {
  id: string;
  organizationId: string;
  clientWorkspaceId: string | null;
  requestedBy: string;
  assignedTo: string | null;
  status: ApprovalStatus;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentApprovalRecord extends ApprovalRecord {
  contentId: string;
}

export interface CampaignApprovalRecord extends ApprovalRecord {
  campaignId: string;
}

export interface CollaborationComment {
  id: string;
  organizationId: string;
  clientWorkspaceId: string | null;
  authorId: string;
  contentId: string | null;
  campaignId: string | null;
  approvalId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorName?: string | null;
}

export interface ActivityLogEntry {
  id: string;
  organizationId: string;
  clientWorkspaceId: string | null;
  actorId: string;
  entityType: string;
  entityId: string;
  action: ActivityAction | string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actorName?: string | null;
}

export interface NotificationRecord {
  id: string;
  organizationId: string;
  recipientId: string;
  clientWorkspaceId: string | null;
  type: NotificationType | string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface CollaborationContext {
  organizationId: string;
  clientWorkspaceId: string | null;
  userId: string;
  clientRole: import("@/lib/workspaces/types").ClientRole | null;
  orgRole: string | null;
}
