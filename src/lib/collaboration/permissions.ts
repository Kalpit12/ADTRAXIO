import type { ClientRole } from "@/lib/workspaces/types";

export type CollaborationPermission =
  | "approval.request"
  | "approval.review"
  | "approval.assign"
  | "comment.create"
  | "comment.edit_own"
  | "comment.delete_own"
  | "comment.moderate"
  | "activity.view"
  | "notifications.view";

const ROLE_PERMISSIONS: Record<ClientRole, CollaborationPermission[]> = {
  owner: [
    "approval.request",
    "approval.review",
    "approval.assign",
    "comment.create",
    "comment.edit_own",
    "comment.delete_own",
    "comment.moderate",
    "activity.view",
    "notifications.view",
  ],
  manager: [
    "approval.request",
    "approval.review",
    "approval.assign",
    "comment.create",
    "comment.edit_own",
    "comment.delete_own",
    "comment.moderate",
    "activity.view",
    "notifications.view",
  ],
  editor: [
    "approval.request",
    "comment.create",
    "comment.edit_own",
    "comment.delete_own",
    "activity.view",
    "notifications.view",
  ],
  viewer: ["comment.create", "activity.view", "notifications.view"],
};

/** Non-agency org members get full collaboration access at org level. */
export function hasCollaborationPermission(
  permission: CollaborationPermission,
  options: {
    clientRole: ClientRole | null;
    orgRole: string | null;
    isAgency: boolean;
  }
): boolean {
  if (options.orgRole === "owner") return true;
  if (!options.isAgency) return true;
  if (!options.clientRole) return false;
  return ROLE_PERMISSIONS[options.clientRole].includes(permission);
}

export function requireCollaborationPermission(
  permission: CollaborationPermission,
  options: {
    clientRole: ClientRole | null;
    orgRole: string | null;
    isAgency: boolean;
  }
): void {
  if (!hasCollaborationPermission(permission, options)) {
    throw new Error("You do not have permission for this action.");
  }
}
