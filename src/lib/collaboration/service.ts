import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceScope } from "@/lib/workspaces/scope";
import { LEGACY_WORKSPACE_SCOPE } from "@/lib/workspaces/scope";

const EMPTY_CLIENT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

function scopeCollaborationQuery<
  T extends { is: (c: string, v: null) => T; eq: (c: string, v: string) => T },
>(query: T, scope: WorkspaceScope): T {
  if (!scope.isAgency) return query.is("client_workspace_id", null);
  if (scope.clientWorkspaceId) {
    return query.eq("client_workspace_id", scope.clientWorkspaceId);
  }
  return query.eq("client_workspace_id", EMPTY_CLIENT_WORKSPACE_ID);
}
import { CollaborationError } from "./errors";
import type { ApprovalStatus, CollaborationContext } from "./types";
import { ACTIVE_APPROVAL_STATUSES, BLOCKING_APPROVAL_STATUSES } from "./constants";

export function collaborationContextFromAuth(auth: {
  organizationId: string;
  user: { id: string };
  workspace: {
    isAgency: boolean;
    clientWorkspaceId: string | null;
    clientRole: import("@/lib/workspaces/types").ClientRole | null;
    orgRole: string | null;
  };
}): CollaborationContext {
  return {
    organizationId: auth.organizationId,
    clientWorkspaceId: auth.workspace.clientWorkspaceId,
    userId: auth.user.id,
    clientRole: auth.workspace.clientRole,
    orgRole: auth.workspace.orgRole,
  };
}

export function permissionOptions(ctx: CollaborationContext, isAgency: boolean) {
  return {
    clientRole: ctx.clientRole,
    orgRole: ctx.orgRole,
    isAgency,
  };
}

export async function verifyContentInWorkspace(
  supabase: SupabaseClient,
  contentId: string,
  organizationId: string,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<{ id: string; client_workspace_id: string | null }> {
  let query = supabase
    .from("content")
    .select("id, client_workspace_id")
    .eq("id", contentId)
    .eq("organization_id", organizationId);

  query = scopeCollaborationQuery(query, scope);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new CollaborationError("Content not found.", "not_found", 404);

  return data as { id: string; client_workspace_id: string | null };
}

export async function verifyCampaignInWorkspace(
  supabase: SupabaseClient,
  campaignId: string,
  organizationId: string,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<{ id: string; client_workspace_id: string | null }> {
  let query = supabase
    .from("campaigns")
    .select("id, client_workspace_id")
    .eq("id", campaignId)
    .eq("organization_id", organizationId);

  query = scopeCollaborationQuery(query, scope);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new CollaborationError("Campaign not found.", "not_found", 404);

  return data as { id: string; client_workspace_id: string | null };
}

export async function verifyWorkspaceMember(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
  clientWorkspaceId: string | null
): Promise<void> {
  const { data: orgMember } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!orgMember) {
    throw new CollaborationError("User is not a member of this organization.", "invalid_assignee", 400);
  }

  if (orgMember.role === "owner") return;

  if (!clientWorkspaceId) return;

  const { data: clientMember } = await supabase
    .from("client_workspace_members")
    .select("id")
    .eq("client_workspace_id", clientWorkspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!clientMember) {
    throw new CollaborationError(
      "Assignee must be a member of this client workspace.",
      "invalid_assignee",
      400
    );
  }
}

export function assertApprovalTransition(
  current: ApprovalStatus,
  next: ApprovalStatus
): void {
  const allowed: Record<ApprovalStatus, ApprovalStatus[]> = {
    pending: ["approved", "rejected", "changes_requested", "cancelled"],
    changes_requested: ["cancelled"],
    approved: [],
    rejected: [],
    cancelled: [],
  };

  if (!allowed[current]?.includes(next)) {
    throw new CollaborationError(
      `Cannot transition approval from ${current} to ${next}.`,
      "invalid_transition",
      400
    );
  }
}

export function isBlockingApprovalStatus(status: ApprovalStatus): boolean {
  return (BLOCKING_APPROVAL_STATUSES as readonly string[]).includes(status);
}

export function isActiveApprovalStatus(status: ApprovalStatus): boolean {
  return (ACTIVE_APPROVAL_STATUSES as readonly string[]).includes(status);
}

export function sanitizeCommentBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new CollaborationError("Comment cannot be empty.", "validation_error", 400);
  }
  if (trimmed.length > 4000) {
    throw new CollaborationError("Comment is too long.", "validation_error", 400);
  }
  return trimmed;
}
