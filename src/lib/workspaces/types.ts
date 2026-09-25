export const CLIENT_ROLES = ["owner", "manager", "editor", "viewer"] as const;
export type ClientRole = (typeof CLIENT_ROLES)[number];

export const CLIENT_STATUSES = ["active", "archived"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export interface ClientWorkspace {
  id: string;
  agencyOrganizationId: string;
  name: string;
  slug: string;
  description: string | null;
  status: ClientStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientWorkspaceSummary extends ClientWorkspace {
  memberCount?: number;
  contentCount?: number;
  campaignCount?: number;
  accountCount?: number;
}

export interface ClientMember {
  id: string;
  clientWorkspaceId: string;
  userId: string;
  role: ClientRole;
  createdAt: string;
  email?: string | null;
  fullName?: string | null;
}

export interface WorkspaceContext {
  organizationId: string;
  organizationType: string | null;
  isAgency: boolean;
  clientWorkspaceId: string | null;
  clientWorkspace: ClientWorkspace | null;
  clientRole: ClientRole | null;
  orgRole: string | null;
}

export interface AccessibleWorkspace {
  id: string | null;
  name: string;
  slug: string | null;
  type: "agency" | "client";
  role: ClientRole | "owner" | null;
}
