import type { ActivityAction } from "./types";

export const APPROVAL_NOTIFICATION_TYPES = new Set<string>([
  "approval_requested",
  "reviewer_assigned",
  "approval_approved",
  "approval_rejected",
  "approval_changes_requested",
  "campaign_review_requested",
]);

export function friendlyCollaborationError(
  message: string | null | undefined
): string {
  if (!message) return "Something went wrong. Try again.";
  if (message.length > 160) return "Something went wrong. Try again.";
  return message;
}

export function formatActivityAction(action: ActivityAction | string): string {
  const map: Record<string, string> = {
    approval_requested: "Review requested",
    approval_approved: "Approved",
    approval_rejected: "Rejected",
    approval_changes_requested: "Changes requested",
    approval_cancelled: "Review cancelled",
    reviewer_assigned: "Reviewer assigned",
    reviewer_changed: "Reviewer changed",
    reviewer_removed: "Reviewer removed",
    comment_added: "Comment added",
    comment_edited: "Comment updated",
    comment_deleted: "Comment removed",
  };
  return map[action] ?? action.replace(/_/g, " ");
}

export function activityReviewHref(metadata: Record<string, unknown> | null): {
  href: string;
  label: string;
} | null {
  if (!metadata) return null;
  const campaignId = metadata.campaignId;
  if (typeof campaignId === "string" && campaignId) {
    return { href: `/campaigns/${campaignId}`, label: "Open campaign" };
  }
  const contentId = metadata.contentId;
  if (typeof contentId === "string" && contentId) {
    return { href: "/create", label: "Open Content Studio" };
  }
  return null;
}

export function isApprovalNotification(type: string): boolean {
  return APPROVAL_NOTIFICATION_TYPES.has(type);
}
