export const APPROVAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "changes_requested",
  "cancelled",
] as const;

export const ACTIVE_APPROVAL_STATUSES = ["pending", "changes_requested"] as const;

export const BLOCKING_APPROVAL_STATUSES = [
  "pending",
  "changes_requested",
  "rejected",
] as const;

export const ACTIVITY_ACTIONS = [
  "approval_requested",
  "approval_approved",
  "approval_rejected",
  "approval_changes_requested",
  "approval_cancelled",
  "reviewer_assigned",
  "reviewer_changed",
  "reviewer_removed",
  "comment_added",
  "comment_edited",
  "comment_deleted",
] as const;

export const NOTIFICATION_TYPES = [
  "approval_requested",
  "reviewer_assigned",
  "approval_approved",
  "approval_rejected",
  "approval_changes_requested",
  "comment_added",
  "campaign_review_requested",
] as const;
