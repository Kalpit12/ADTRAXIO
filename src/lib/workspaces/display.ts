import type { ClientRole, ClientStatus } from "./types";

export const ROLE_LABELS: Record<ClientRole, string> = {
  owner: "Owner",
  manager: "Manager",
  editor: "Editor",
  viewer: "Viewer",
};

/** Aligned with `ROLE_PERMISSIONS` in permissions.ts */
export const ROLE_DESCRIPTIONS: Record<ClientRole, string> = {
  owner:
    "Full workspace access — settings, members, content, campaigns, publishing, analytics, and reports.",
  manager:
    "Same operational access as owner for this client workspace, including members and settings.",
  editor:
    "Create and edit content, campaigns, social connections, publishing, and reports. Cannot manage members or workspace settings.",
  viewer:
    "View content, analytics, and reports without making changes.",
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Active",
  archived: "Archived",
};

export function friendlyWorkspaceError(
  message: string | null | undefined
): string {
  if (!message) return "Something went wrong. Try again.";
  if (message.length > 160 || /supabase|rls|policy|uuid/i.test(message)) {
    return "Something went wrong. Try again.";
  }
  return message;
}

export function formatMemberDisplayName(input: {
  fullName?: string | null;
  email?: string | null;
}): string {
  if (input.fullName?.trim()) return input.fullName.trim();
  if (input.email?.trim()) return input.email.trim();
  return "Team member";
}
