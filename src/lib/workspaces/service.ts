import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/billing/stripe";
import { getOrgMemberRole, verifyClientWorkspaceAccess } from "./access";
import { requireClientPermission } from "./permissions";
import type {
  ClientMember,
  ClientRole,
  ClientStatus,
  ClientWorkspace,
  ClientWorkspaceSummary,
} from "./types";

export class ClientWorkspaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientWorkspaceError";
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
    status: row.status as ClientStatus,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function listClientWorkspaces(
  supabase: SupabaseClient,
  organizationId: string
): Promise<ClientWorkspaceSummary[]> {
  const { data, error } = await supabase
    .from("client_workspaces")
    .select("*")
    .eq("agency_organization_id", organizationId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }

  const clients = (data ?? []).map((row) => mapClient(row as ClientRow));
  if (clients.length === 0) return [];

  const ids = clients.map((c) => c.id);

  const [
    { data: members },
    { data: contentLinks },
    { data: campaigns },
    { data: accounts },
  ] = await Promise.all([
    supabase
      .from("client_workspace_members")
      .select("client_workspace_id")
      .in("client_workspace_id", ids),
    supabase.from("content").select("client_workspace_id").in("client_workspace_id", ids),
    supabase.from("campaigns").select("client_workspace_id").in("client_workspace_id", ids),
    supabase
      .from("social_accounts")
      .select("client_workspace_id")
      .in("client_workspace_id", ids)
      .eq("status", "connected"),
  ]);

  const countBy = (rows: { client_workspace_id: string }[] | null) => {
    const map = new Map<string, number>();
    for (const row of rows ?? []) {
      const id = row.client_workspace_id;
      map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  };

  const memberCounts = countBy(members as { client_workspace_id: string }[]);
  const contentCounts = countBy(contentLinks as { client_workspace_id: string }[]);
  const campaignCounts = countBy(campaigns as { client_workspace_id: string }[]);
  const accountCounts = countBy(accounts as { client_workspace_id: string }[]);

  return clients.map((client) => ({
    ...client,
    memberCount: memberCounts.get(client.id) ?? 0,
    contentCount: contentCounts.get(client.id) ?? 0,
    campaignCount: campaignCounts.get(client.id) ?? 0,
    accountCount: accountCounts.get(client.id) ?? 0,
  }));
}

export async function getClientWorkspace(
  supabase: SupabaseClient,
  organizationId: string,
  clientId: string
): Promise<ClientWorkspaceSummary | null> {
  const { data, error } = await supabase
    .from("client_workspaces")
    .select("*")
    .eq("id", clientId)
    .eq("agency_organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const client = mapClient(data as ClientRow);
  const [members, content, campaigns, accounts] = await Promise.all([
    supabase
      .from("client_workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("client_workspace_id", clientId),
    supabase
      .from("content")
      .select("id", { count: "exact", head: true })
      .eq("client_workspace_id", clientId),
    supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("client_workspace_id", clientId),
    supabase
      .from("social_accounts")
      .select("id", { count: "exact", head: true })
      .eq("client_workspace_id", clientId)
      .eq("status", "connected"),
  ]);

  return {
    ...client,
    memberCount: members.count ?? 0,
    contentCount: content.count ?? 0,
    campaignCount: campaigns.count ?? 0,
    accountCount: accounts.count ?? 0,
  };
}

export async function createClientWorkspace(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    userId: string;
    name: string;
    description?: string | null;
    slug?: string;
    initialOwnerEmail?: string | null;
  }
): Promise<ClientWorkspace> {
  const orgRole = await getOrgMemberRole(supabase, input.organizationId, input.userId);
  if (orgRole !== "owner") {
    throw new ClientWorkspaceError("Only agency owners can create clients.");
  }

  const slug = slugify(input.slug || input.name);
  if (!slug) {
    throw new ClientWorkspaceError("A valid client slug is required.");
  }

  const { data, error } = await supabase
    .from("client_workspaces")
    .insert({
      agency_organization_id: input.organizationId,
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      status: "active",
      created_by: input.userId,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ClientWorkspaceError("A client with this slug already exists.");
    }
    throw new Error(error.message);
  }

  const client = mapClient(data as ClientRow);

  await supabase.from("client_workspace_members").insert({
    client_workspace_id: client.id,
    user_id: input.userId,
    role: "owner",
  });

  if (input.initialOwnerEmail?.trim()) {
    await createClientInvitation(supabase, {
      clientWorkspaceId: client.id,
      organizationId: input.organizationId,
      invitedBy: input.userId,
      email: input.initialOwnerEmail.trim(),
      role: "manager",
    });
  }

  return client;
}

export async function updateClientWorkspace(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    userId: string;
    clientId: string;
    name?: string;
    description?: string | null;
    status?: ClientStatus;
    clientRole: ClientRole | null;
    orgRole: string | null;
  }
): Promise<ClientWorkspace> {
  requireClientPermission(input.clientRole, "client.manage", {
    orgRole: input.orgRole,
  });

  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.description !== undefined) payload.description = input.description;
  if (input.status !== undefined) payload.status = input.status;

  const { data, error } = await supabase
    .from("client_workspaces")
    .update(payload)
    .eq("id", input.clientId)
    .eq("agency_organization_id", input.organizationId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapClient(data as ClientRow);
}

export async function listClientMembers(
  supabase: SupabaseClient,
  clientWorkspaceId: string
): Promise<ClientMember[]> {
  const { data, error } = await supabase
    .from("client_workspace_members")
    .select("id, client_workspace_id, user_id, role, created_at")
    .eq("client_workspace_id", clientWorkspaceId);

  if (error) throw new Error(error.message);

  const members: ClientMember[] = [];
  for (const row of data ?? []) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", row.user_id as string)
      .maybeSingle();

    members.push({
      id: row.id as string,
      clientWorkspaceId: row.client_workspace_id as string,
      userId: row.user_id as string,
      role: row.role as ClientRole,
      createdAt: row.created_at as string,
      fullName: profile?.full_name ?? null,
    });
  }

  return members;
}

export async function updateClientMemberRole(
  supabase: SupabaseClient,
  input: {
    clientWorkspaceId: string;
    memberId: string;
    role: ClientRole;
    actorRole: ClientRole | null;
    orgRole: string | null;
  }
): Promise<void> {
  requireClientPermission(input.actorRole, "client.members", {
    orgRole: input.orgRole,
  });

  const { error } = await supabase
    .from("client_workspace_members")
    .update({ role: input.role })
    .eq("id", input.memberId)
    .eq("client_workspace_id", input.clientWorkspaceId);

  if (error) throw new Error(error.message);
}

export async function removeClientMember(
  supabase: SupabaseClient,
  input: {
    clientWorkspaceId: string;
    memberId: string;
    actorRole: ClientRole | null;
    orgRole: string | null;
  }
): Promise<void> {
  requireClientPermission(input.actorRole, "client.members", {
    orgRole: input.orgRole,
  });

  const { error } = await supabase
    .from("client_workspace_members")
    .delete()
    .eq("id", input.memberId)
    .eq("client_workspace_id", input.clientWorkspaceId);

  if (error) throw new Error(error.message);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createClientInvitation(
  supabase: SupabaseClient,
  input: {
    clientWorkspaceId: string;
    organizationId: string;
    invitedBy: string;
    email: string;
    role: ClientRole;
  }
): Promise<{ inviteUrl: string; expiresAt: string }> {
  await verifyClientWorkspaceAccess(
    supabase,
    input.organizationId,
    input.invitedBy,
    input.clientWorkspaceId
  );

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("client_invitations").insert({
    client_workspace_id: input.clientWorkspaceId,
    email: input.email.toLowerCase(),
    role: input.role,
    invited_by: input.invitedBy,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) throw new Error(error.message);

  const inviteUrl = `${getAppUrl()}/clients/invite?token=${token}`;

  if (process.env.NODE_ENV !== "production") {
    console.info("[ADTRAXIO] Client invitation URL (dev only):", inviteUrl);
  }

  return { inviteUrl, expiresAt };
}

export async function acceptClientInvitation(
  supabase: SupabaseClient,
  input: {
    token: string;
    userId: string;
    userEmail: string | null;
  }
): Promise<{ clientWorkspaceId: string }> {
  const tokenHash = hashToken(input.token);
  const admin = createAdminClient();
  const db = admin ?? supabase;

  const { data: invitation, error } = await db
    .from("client_invitations")
    .select("*")
    .eq("token_hash", tokenHash)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !invitation) {
    throw new ClientWorkspaceError("Invitation is invalid or expired.");
  }

  if (
    input.userEmail &&
    invitation.email.toLowerCase() !== input.userEmail.toLowerCase()
  ) {
    throw new ClientWorkspaceError("This invitation was sent to a different email.");
  }

  const { error: memberError } = await db.from("client_workspace_members").upsert(
    {
      client_workspace_id: invitation.client_workspace_id,
      user_id: input.userId,
      role: invitation.role,
    },
    { onConflict: "client_workspace_id,user_id" }
  );

  if (memberError) throw new Error(memberError.message);

  await db
    .from("client_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  return { clientWorkspaceId: invitation.client_workspace_id as string };
}
