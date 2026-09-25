import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientRole, ClientWorkspace } from "./types";

export class WorkspaceAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceAccessError";
  }
}

type ClientRow = {
  id: string;
  agency_organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function mapClient(row: ClientRow): ClientWorkspace {
  return {
    id: row.id,
    agencyOrganizationId: row.agency_organization_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: row.status as ClientWorkspace["status"],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getOrganizationType(
  supabase: SupabaseClient,
  organizationId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("organizations")
    .select("type")
    .eq("id", organizationId)
    .maybeSingle();

  return (data?.type as string) ?? null;
}

export async function getOrgMemberRole(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  return (data?.role as string) ?? null;
}

export async function getClientMemberRole(
  supabase: SupabaseClient,
  clientWorkspaceId: string,
  userId: string
): Promise<ClientRole | null> {
  const { data } = await supabase
    .from("client_workspace_members")
    .select("role")
    .eq("client_workspace_id", clientWorkspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  return (data?.role as ClientRole) ?? null;
}

export async function verifyClientWorkspaceAccess(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  clientWorkspaceId: string
): Promise<{ client: ClientWorkspace; role: ClientRole | null; orgRole: string | null }> {
  const { data, error } = await supabase
    .from("client_workspaces")
    .select("*")
    .eq("id", clientWorkspaceId)
    .eq("agency_organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new WorkspaceAccessError("Client workspace not found.");

  const orgRole = await getOrgMemberRole(supabase, organizationId, userId);
  if (!orgRole) throw new WorkspaceAccessError("Not a member of this organization.");

  let role = await getClientMemberRole(supabase, clientWorkspaceId, userId);

  if (orgRole !== "owner" && !role) {
    throw new WorkspaceAccessError("You do not have access to this client workspace.");
  }

  if (orgRole === "owner" && !role) {
    role = "owner";
  }

  return { client: mapClient(data as ClientRow), role, orgRole };
}
