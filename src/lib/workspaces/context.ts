import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/org/get-organization-id";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  getOrganizationType,
  getOrgMemberRole,
  verifyClientWorkspaceAccess,
  WorkspaceAccessError,
} from "./access";
import { CLIENT_WORKSPACE_COOKIE } from "./constants";
import type { AccessibleWorkspace, ClientRole, WorkspaceContext } from "./types";

export type WorkspaceAuthResult =
  | {
      supabase: SupabaseClient;
      user: User;
      workspace: WorkspaceContext;
    }
  | { error: string; status: number; code?: string };

async function readClientWorkspaceCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(CLIENT_WORKSPACE_COOKIE)?.value?.trim();
  if (!value) return null;
  return value;
}

export async function requireWorkspaceContext(options?: {
  requireClient?: boolean;
}): Promise<WorkspaceAuthResult> {
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Workspace is not configured.", status: 503 };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized.", status: 401 };
  }

  const organizationId = await getOrganizationId(supabase, user.id);
  if (!organizationId) {
    return { error: "No workspace found.", status: 403 };
  }

  const organizationType = await getOrganizationType(supabase, organizationId);
  const isAgency = organizationType === "agency";
  const orgRole = await getOrgMemberRole(supabase, organizationId, user.id);

  const cookieClientId = await readClientWorkspaceCookie();
  let clientWorkspaceId: string | null = null;
  let clientWorkspace = null;
  let clientRole: ClientRole | null = null;

  if (isAgency && cookieClientId) {
    try {
      const access = await verifyClientWorkspaceAccess(
        supabase,
        organizationId,
        user.id,
        cookieClientId
      );
      clientWorkspaceId = access.client.id;
      clientWorkspace = access.client;
      clientRole = access.role;
    } catch {
      clientWorkspaceId = null;
    }
  }

  if (options?.requireClient && isAgency && !clientWorkspaceId) {
    return {
      error: "Select a client workspace to continue.",
      status: 403,
      code: "CLIENT_WORKSPACE_REQUIRED",
    };
  }

  return {
    supabase,
    user,
    workspace: {
      organizationId,
      organizationType,
      isAgency,
      clientWorkspaceId,
      clientWorkspace,
      clientRole,
      orgRole,
    },
  };
}

export async function listAccessibleWorkspaces(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  isAgency: boolean
): Promise<AccessibleWorkspace[]> {
  if (!isAgency) {
    return [
      {
        id: null,
        name: "Workspace",
        slug: null,
        type: "agency",
        role: null,
      },
    ];
  }

  const orgRole = await getOrgMemberRole(supabase, organizationId, userId);
  const workspaces: AccessibleWorkspace[] = [
    {
      id: null,
      name: "Agency",
      slug: null,
      type: "agency",
      role: orgRole === "owner" ? "owner" : null,
    },
  ];

  const query = supabase
    .from("client_workspaces")
    .select("id, name, slug, status")
    .eq("agency_organization_id", organizationId)
    .eq("status", "active")
    .order("name", { ascending: true });

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return workspaces;
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    if (orgRole === "owner") {
      workspaces.push({
        id: row.id as string,
        name: row.name as string,
        slug: row.slug as string,
        type: "client",
        role: "owner",
      });
      continue;
    }

    const { data: membership } = await supabase
      .from("client_workspace_members")
      .select("role")
      .eq("client_workspace_id", row.id as string)
      .eq("user_id", userId)
      .maybeSingle();

    if (membership) {
      workspaces.push({
        id: row.id as string,
        name: row.name as string,
        slug: row.slug as string,
        type: "client",
        role: membership.role as ClientRole,
      });
    }
  }

  return workspaces;
}

export { WorkspaceAccessError };
