import type { ClientRole } from "./types";

export type ClientPermission =
  | "client.view"
  | "client.manage"
  | "client.members"
  | "content.edit"
  | "content.view"
  | "campaigns.edit"
  | "social.manage"
  | "publishing.edit"
  | "analytics.view"
  | "intelligence.generate"
  | "report.view"
  | "report.create"
  | "report.edit"
  | "report.publish"
  | "report.archive";

const ROLE_PERMISSIONS: Record<ClientRole, ClientPermission[]> = {
  owner: [
    "client.view",
    "client.manage",
    "client.members",
    "content.edit",
    "content.view",
    "campaigns.edit",
    "social.manage",
    "publishing.edit",
    "analytics.view",
    "intelligence.generate",
    "report.view",
    "report.create",
    "report.edit",
    "report.publish",
    "report.archive",
  ],
  manager: [
    "client.view",
    "client.manage",
    "client.members",
    "content.edit",
    "content.view",
    "campaigns.edit",
    "social.manage",
    "publishing.edit",
    "analytics.view",
    "intelligence.generate",
    "report.view",
    "report.create",
    "report.edit",
    "report.publish",
    "report.archive",
  ],
  editor: [
    "client.view",
    "content.edit",
    "content.view",
    "campaigns.edit",
    "social.manage",
    "publishing.edit",
    "analytics.view",
    "report.view",
    "report.create",
    "report.edit",
  ],
  viewer: ["client.view", "content.view", "analytics.view", "report.view"],
};

export function hasClientPermission(
  role: ClientRole | null,
  permission: ClientPermission,
  options?: { orgRole?: string | null }
): boolean {
  if (options?.orgRole === "owner") return true;
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function requireClientPermission(
  role: ClientRole | null,
  permission: ClientPermission,
  options?: { orgRole?: string | null }
): void {
  if (!hasClientPermission(role, permission, options)) {
    throw new Error("You do not have permission for this action.");
  }
}
