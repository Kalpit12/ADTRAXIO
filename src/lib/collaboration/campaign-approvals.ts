import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceScope } from "@/lib/workspaces/scope";
import { recordActivity } from "./activity";
import { CollaborationError } from "./errors";
import { createNotification } from "./notifications";
import { requireCollaborationPermission } from "./permissions";
import {
  assertApprovalTransition,
  isBlockingApprovalStatus,
  permissionOptions,
  verifyCampaignInWorkspace,
  verifyWorkspaceMember,
} from "./service";
import type { ApprovalStatus, CampaignApprovalRecord, CollaborationContext } from "./types";

type ApprovalRow = {
  id: string;
  organization_id: string;
  client_workspace_id: string | null;
  campaign_id: string;
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

function mapApproval(row: ApprovalRow): CampaignApprovalRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientWorkspaceId: row.client_workspace_id,
    campaignId: row.campaign_id,
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

export async function getLatestCampaignApproval(
  supabase: SupabaseClient,
  campaignId: string,
  organizationId: string
): Promise<CampaignApprovalRecord | null> {
  const { data, error } = await supabase
    .from("campaign_approvals")
    .select("*")
    .eq("campaign_id", campaignId)
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

export async function getActiveCampaignApproval(
  supabase: SupabaseClient,
  campaignId: string,
  organizationId: string
): Promise<CampaignApprovalRecord | null> {
  const { data, error } = await supabase
    .from("campaign_approvals")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("organization_id", organizationId)
    .in("status", ["pending", "changes_requested"])
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    throw new Error(error.message);
  }

  return data ? mapApproval(data as ApprovalRow) : null;
}

async function transitionCampaignApproval(
  supabase: SupabaseClient,
  input: {
    campaignId: string;
    ctx: CollaborationContext;
    scope: WorkspaceScope;
    isAgency: boolean;
    nextStatus: ApprovalStatus;
    rejectionReason?: string | null;
    permission: "approval.review" | "approval.request";
    activityAction: string;
    notification?: { recipientId: string; type: string; title: string; body: string };
  }
): Promise<CampaignApprovalRecord> {
  requireCollaborationPermission(input.permission, permissionOptions(input.ctx, input.isAgency));

  await verifyCampaignInWorkspace(
    supabase,
    input.campaignId,
    input.ctx.organizationId,
    input.scope
  );

  const approval = await getActiveCampaignApproval(
    supabase,
    input.campaignId,
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
    .from("campaign_approvals")
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
    entityType: "campaign_approval",
    entityId: updated.id,
    action: input.activityAction,
    metadata: { campaignId: input.campaignId, status: input.nextStatus },
  });

  if (input.notification) {
    await createNotification(supabase, {
      organizationId: input.ctx.organizationId,
      recipientId: input.notification.recipientId,
      clientWorkspaceId: input.ctx.clientWorkspaceId,
      type: input.notification.type,
      title: input.notification.title,
      body: input.notification.body,
      entityType: "campaign_approval",
      entityId: updated.id,
    });
  }

  return updated;
}

export async function requestCampaignApproval(
  supabase: SupabaseClient,
  input: {
    campaignId: string;
    ctx: CollaborationContext;
    scope: WorkspaceScope;
    isAgency: boolean;
    assignedTo?: string | null;
  }
): Promise<CampaignApprovalRecord> {
  requireCollaborationPermission("approval.request", permissionOptions(input.ctx, input.isAgency));

  await verifyCampaignInWorkspace(
    supabase,
    input.campaignId,
    input.ctx.organizationId,
    input.scope
  );

  const active = await getActiveCampaignApproval(
    supabase,
    input.campaignId,
    input.ctx.organizationId
  );
  if (active) {
    throw new CollaborationError(
      "An active approval request already exists for this campaign.",
      "duplicate_approval",
      409
    );
  }

  const latest = await getLatestCampaignApproval(
    supabase,
    input.campaignId,
    input.ctx.organizationId
  );
  if (latest?.status === "approved") {
    throw new CollaborationError(
      "Campaign is already approved.",
      "already_approved",
      409
    );
  }

  if (latest?.status === "changes_requested") {
    await transitionCampaignApproval(supabase, {
      campaignId: input.campaignId,
      ctx: input.ctx,
      scope: input.scope,
      isAgency: input.isAgency,
      nextStatus: "cancelled",
      permission: "approval.request",
      activityAction: "approval_cancelled",
    });
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
    .from("campaign_approvals")
    .insert({
      organization_id: input.ctx.organizationId,
      client_workspace_id: input.ctx.clientWorkspaceId,
      campaign_id: input.campaignId,
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
    entityType: "campaign_approval",
    entityId: approval.id,
    action: "approval_requested",
    metadata: { campaignId: input.campaignId },
  });

  if (input.assignedTo) {
    await createNotification(supabase, {
      organizationId: input.ctx.organizationId,
      recipientId: input.assignedTo,
      clientWorkspaceId: input.ctx.clientWorkspaceId,
      type: "campaign_review_requested",
      title: "Campaign review requested",
      body: "You have been assigned to review a campaign.",
      entityType: "campaign_approval",
      entityId: approval.id,
    });
  }

  return approval;
}

export async function approveCampaignApproval(
  supabase: SupabaseClient,
  campaignId: string,
  ctx: CollaborationContext,
  scope: WorkspaceScope,
  isAgency: boolean
) {
  const approval = await getActiveCampaignApproval(supabase, campaignId, ctx.organizationId);
  return transitionCampaignApproval(supabase, {
    campaignId,
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
          title: "Campaign approved",
          body: "Your campaign review was approved.",
        }
      : undefined,
  });
}

export async function rejectCampaignApproval(
  supabase: SupabaseClient,
  campaignId: string,
  ctx: CollaborationContext,
  scope: WorkspaceScope,
  isAgency: boolean,
  reason?: string
) {
  const approval = await getActiveCampaignApproval(supabase, campaignId, ctx.organizationId);
  return transitionCampaignApproval(supabase, {
    campaignId,
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
          title: "Campaign rejected",
          body: reason?.trim() || "Your campaign review was rejected.",
        }
      : undefined,
  });
}

export async function requestCampaignChanges(
  supabase: SupabaseClient,
  campaignId: string,
  ctx: CollaborationContext,
  scope: WorkspaceScope,
  isAgency: boolean,
  reason?: string
) {
  const approval = await getActiveCampaignApproval(supabase, campaignId, ctx.organizationId);
  return transitionCampaignApproval(supabase, {
    campaignId,
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
          title: "Campaign changes requested",
          body: reason?.trim() || "Changes were requested on your campaign.",
        }
      : undefined,
  });
}

export async function cancelCampaignApproval(
  supabase: SupabaseClient,
  campaignId: string,
  ctx: CollaborationContext,
  scope: WorkspaceScope,
  isAgency: boolean
) {
  return transitionCampaignApproval(supabase, {
    campaignId,
    ctx,
    scope,
    isAgency,
    nextStatus: "cancelled",
    permission: "approval.request",
    activityAction: "approval_cancelled",
  });
}

export async function assignCampaignReviewer(
  supabase: SupabaseClient,
  campaignId: string,
  ctx: CollaborationContext,
  scope: WorkspaceScope,
  isAgency: boolean,
  assigneeId: string | null
) {
  requireCollaborationPermission("approval.assign", permissionOptions(ctx, isAgency));

  const approval = await getActiveCampaignApproval(supabase, campaignId, ctx.organizationId);
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
    .from("campaign_approvals")
    .update({ assigned_to: assigneeId })
    .eq("id", approval.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await recordActivity(supabase, {
    organizationId: ctx.organizationId,
    clientWorkspaceId: ctx.clientWorkspaceId,
    actorId: ctx.userId,
    entityType: "campaign_approval",
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
      title: "Assigned as campaign reviewer",
      body: "You have been assigned to review a campaign.",
      entityType: "campaign_approval",
      entityId: approval.id,
    });
  }

  return mapApproval(data as ApprovalRow);
}

export { isBlockingApprovalStatus };
