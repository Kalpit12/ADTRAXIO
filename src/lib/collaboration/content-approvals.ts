import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceScope } from "@/lib/workspaces/scope";
import { recordActivity } from "./activity";
import { CollaborationError } from "./errors";
import { createNotification } from "./notifications";
import { requireCollaborationPermission } from "./permissions";
import {
  assertApprovalTransition,
  collaborationContextFromAuth,
  isBlockingApprovalStatus,
  permissionOptions,
  verifyContentInWorkspace,
  verifyWorkspaceMember,
} from "./service";
import type { ApprovalStatus, ContentApprovalRecord, CollaborationContext } from "./types";

type ApprovalRow = {
  id: string;
  organization_id: string;
  client_workspace_id: string | null;
  content_id: string;
  requested_by: string;
  assigned_to: string | null;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

function mapApproval(row: ApprovalRow): ContentApprovalRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientWorkspaceId: row.client_workspace_id,
    contentId: row.content_id,
    requestedBy: row.requested_by,
    assignedTo: row.assigned_to,
    status: row.status as ApprovalStatus,
    requestedAt: row.requested_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getLatestContentApproval(
  supabase: SupabaseClient,
  contentId: string,
  organizationId: string
): Promise<ContentApprovalRecord | null> {
  const { data, error } = await supabase
    .from("content_approvals")
    .select("*")
    .eq("content_id", contentId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    throw new Error(error.message);
  }

  return data ? mapApproval(data as ApprovalRow) : null;
}

export async function getActiveContentApproval(
  supabase: SupabaseClient,
  contentId: string,
  organizationId: string
): Promise<ContentApprovalRecord | null> {
  const { data, error } = await supabase
    .from("content_approvals")
    .select("*")
    .eq("content_id", contentId)
    .eq("organization_id", organizationId)
    .in("status", ["pending", "changes_requested"])
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    throw new Error(error.message);
  }

  return data ? mapApproval(data as ApprovalRow) : null;
}

export async function assertContentApprovedForPublishing(
  supabase: SupabaseClient,
  contentId: string,
  organizationId: string
): Promise<void> {
  const latest = await getLatestContentApproval(supabase, contentId, organizationId);
  if (!latest) return;
  if (latest.status === "approved" || latest.status === "cancelled") return;
  if (isBlockingApprovalStatus(latest.status)) {
    throw new CollaborationError(
      "Content must be approved before publishing.",
      "approval_required",
      403
    );
  }
}

export async function requestContentApproval(
  supabase: SupabaseClient,
  input: {
    contentId: string;
    ctx: CollaborationContext;
    scope: WorkspaceScope;
    isAgency: boolean;
    assignedTo?: string | null;
  }
): Promise<ContentApprovalRecord> {
  requireCollaborationPermission("approval.request", permissionOptions(input.ctx, input.isAgency));

  await verifyContentInWorkspace(
    supabase,
    input.contentId,
    input.ctx.organizationId,
    input.scope
  );

  const active = await getActiveContentApproval(
    supabase,
    input.contentId,
    input.ctx.organizationId
  );
  if (active) {
    throw new CollaborationError(
      "An active approval request already exists for this content.",
      "duplicate_approval",
      409
    );
  }

  const latest = await getLatestContentApproval(
    supabase,
    input.contentId,
    input.ctx.organizationId
  );
  if (latest?.status === "approved") {
    throw new CollaborationError(
      "Content is already approved. Cancel or request changes before a new review.",
      "already_approved",
      409
    );
  }

  if (input.assignedTo) {
    await verifyWorkspaceMember(
      supabase,
      input.assignedTo,
      input.ctx.organizationId,
      input.ctx.clientWorkspaceId
    );
  }

  const { data, error } = await supabase
    .from("content_approvals")
    .insert({
      organization_id: input.ctx.organizationId,
      client_workspace_id: input.ctx.clientWorkspaceId,
      content_id: input.contentId,
      requested_by: input.ctx.userId,
      assigned_to: input.assignedTo ?? null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const approval = mapApproval(data as ApprovalRow);

  await recordActivity(supabase, {
    organizationId: input.ctx.organizationId,
    clientWorkspaceId: input.ctx.clientWorkspaceId,
    actorId: input.ctx.userId,
    entityType: "content_approval",
    entityId: approval.id,
    action: "approval_requested",
    metadata: { contentId: input.contentId },
  });

  if (input.assignedTo) {
    await createNotification(supabase, {
      organizationId: input.ctx.organizationId,
      recipientId: input.assignedTo,
      clientWorkspaceId: input.ctx.clientWorkspaceId,
      type: "reviewer_assigned",
      title: "Assigned as content reviewer",
      body: "You have been assigned to review content.",
      entityType: "content_approval",
      entityId: approval.id,
    });
  }

  return approval;
}

async function transitionContentApproval(
  supabase: SupabaseClient,
  input: {
    contentId: string;
    ctx: CollaborationContext;
    scope: WorkspaceScope;
    isAgency: boolean;
    nextStatus: ApprovalStatus;
    rejectionReason?: string | null;
    permission: "approval.review" | "approval.request";
    activityAction: string;
    notification?: { recipientId: string; type: string; title: string; body: string };
  }
): Promise<ContentApprovalRecord> {
  requireCollaborationPermission(input.permission, permissionOptions(input.ctx, input.isAgency));

  await verifyContentInWorkspace(
    supabase,
    input.contentId,
    input.ctx.organizationId,
    input.scope
  );

  const approval = await getActiveContentApproval(
    supabase,
    input.contentId,
    input.ctx.organizationId
  );

  if (!approval) {
    throw new CollaborationError("No active approval to update.", "not_found", 404);
  }

  assertApprovalTransition(approval.status, input.nextStatus);

  const reviewedStatuses: ApprovalStatus[] = ["approved", "rejected", "changes_requested"];
  const payload: Record<string, unknown> = { status: input.nextStatus };
  if (reviewedStatuses.includes(input.nextStatus)) {
    payload.reviewed_at = new Date().toISOString();
    payload.reviewed_by = input.ctx.userId;
    payload.rejection_reason = input.rejectionReason ?? null;
  }
  if (input.nextStatus === "cancelled") {
    payload.reviewed_at = null;
    payload.reviewed_by = null;
  }

  const { data, error } = await supabase
    .from("content_approvals")
    .update(payload)
    .eq("id", approval.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const updated = mapApproval(data as ApprovalRow);

  await recordActivity(supabase, {
    organizationId: input.ctx.organizationId,
    clientWorkspaceId: input.ctx.clientWorkspaceId,
    actorId: input.ctx.userId,
    entityType: "content_approval",
    entityId: updated.id,
    action: input.activityAction,
    metadata: { contentId: input.contentId, status: input.nextStatus },
  });

  if (input.notification) {
    await createNotification(supabase, {
      organizationId: input.ctx.organizationId,
      recipientId: input.notification.recipientId,
      clientWorkspaceId: input.ctx.clientWorkspaceId,
      type: input.notification.type,
      title: input.notification.title,
      body: input.notification.body,
      entityType: "content_approval",
      entityId: updated.id,
    });
  }

  return updated;
}

export async function approveContentApproval(
  supabase: SupabaseClient,
  contentId: string,
  ctx: CollaborationContext,
  scope: WorkspaceScope,
  isAgency: boolean
) {
  const approval = await getActiveContentApproval(supabase, contentId, ctx.organizationId);
  return transitionContentApproval(supabase, {
    contentId,
    ctx,
    scope,
    isAgency,
    nextStatus: "approved",
    permission: "approval.review",
    activityAction: "approval_approved",
    notification: approval
      ? {
          recipientId: approval.requestedBy,
          type: "approval_approved",
          title: "Content approved",
          body: "Your content review was approved.",
        }
      : undefined,
  });
}

export async function rejectContentApproval(
  supabase: SupabaseClient,
  contentId: string,
  ctx: CollaborationContext,
  scope: WorkspaceScope,
  isAgency: boolean,
  reason?: string
) {
  const approval = await getActiveContentApproval(supabase, contentId, ctx.organizationId);
  return transitionContentApproval(supabase, {
    contentId,
    ctx,
    scope,
    isAgency,
    nextStatus: "rejected",
    rejectionReason: reason,
    permission: "approval.review",
    activityAction: "approval_rejected",
    notification: approval
      ? {
          recipientId: approval.requestedBy,
          type: "approval_rejected",
          title: "Content rejected",
          body: reason?.trim() || "Your content review was rejected.",
        }
      : undefined,
  });
}

export async function requestContentChanges(
  supabase: SupabaseClient,
  contentId: string,
  ctx: CollaborationContext,
  scope: WorkspaceScope,
  isAgency: boolean,
  reason?: string
) {
  const approval = await getActiveContentApproval(supabase, contentId, ctx.organizationId);
  return transitionContentApproval(supabase, {
    contentId,
    ctx,
    scope,
    isAgency,
    nextStatus: "changes_requested",
    rejectionReason: reason,
    permission: "approval.review",
    activityAction: "approval_changes_requested",
    notification: approval
      ? {
          recipientId: approval.requestedBy,
          type: "approval_changes_requested",
          title: "Changes requested",
          body: reason?.trim() || "Changes were requested on your content.",
        }
      : undefined,
  });
}

export async function cancelContentApproval(
  supabase: SupabaseClient,
  contentId: string,
  ctx: CollaborationContext,
  scope: WorkspaceScope,
  isAgency: boolean
) {
  return transitionContentApproval(supabase, {
    contentId,
    ctx,
    scope,
    isAgency,
    nextStatus: "cancelled",
    permission: "approval.request",
    activityAction: "approval_cancelled",
  });
}

export async function assignContentReviewer(
  supabase: SupabaseClient,
  contentId: string,
  ctx: CollaborationContext,
  scope: WorkspaceScope,
  isAgency: boolean,
  assigneeId: string | null
) {
  requireCollaborationPermission("approval.assign", permissionOptions(ctx, isAgency));

  const approval = await getActiveContentApproval(supabase, contentId, ctx.organizationId);
  if (!approval) {
    throw new CollaborationError("No active approval to assign.", "not_found", 404);
  }

  if (assigneeId) {
    await verifyWorkspaceMember(
      supabase,
      assigneeId,
      ctx.organizationId,
      ctx.clientWorkspaceId
    );
  }

  const previousAssignee = approval.assignedTo;
  const action =
    previousAssignee && assigneeId && previousAssignee !== assigneeId
      ? "reviewer_changed"
      : assigneeId
        ? "reviewer_assigned"
        : "reviewer_removed";

  const { data, error } = await supabase
    .from("content_approvals")
    .update({ assigned_to: assigneeId })
    .eq("id", approval.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await recordActivity(supabase, {
    organizationId: ctx.organizationId,
    clientWorkspaceId: ctx.clientWorkspaceId,
    actorId: ctx.userId,
    entityType: "content_approval",
    entityId: approval.id,
    action,
    metadata: { assigneeId, previousAssignee },
  });

  if (assigneeId) {
    await createNotification(supabase, {
      organizationId: ctx.organizationId,
      recipientId: assigneeId,
      clientWorkspaceId: ctx.clientWorkspaceId,
      type: "reviewer_assigned",
      title: "Assigned as content reviewer",
      body: "You have been assigned to review content.",
      entityType: "content_approval",
      entityId: approval.id,
    });
  }

  return mapApproval(data as ApprovalRow);
}

/** Re-request after changes_requested creates a new approval record. */
export async function resubmitContentApproval(
  supabase: SupabaseClient,
  contentId: string,
  ctx: CollaborationContext,
  scope: WorkspaceScope,
  isAgency: boolean,
  assignedTo?: string | null
): Promise<ContentApprovalRecord> {
  const latest = await getLatestContentApproval(supabase, contentId, ctx.organizationId);
  if (latest?.status === "changes_requested") {
    await transitionContentApproval(supabase, {
      contentId,
      ctx,
      scope,
      isAgency,
      nextStatus: "cancelled",
      permission: "approval.request",
      activityAction: "approval_cancelled",
    });
  }

  return requestContentApproval(supabase, {
    contentId,
    ctx,
    scope,
    isAgency,
    assignedTo,
  });
}

export { collaborationContextFromAuth };
