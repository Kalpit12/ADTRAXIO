import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceScope } from "@/lib/workspaces/scope";
import { recordActivity } from "./activity";
import { CollaborationError } from "./errors";
import { createNotification } from "./notifications";
import { requireCollaborationPermission } from "./permissions";
import {
  permissionOptions,
  sanitizeCommentBody,
  verifyCampaignInWorkspace,
  verifyContentInWorkspace,
} from "./service";
import type { CollaborationComment, CollaborationContext } from "./types";

type CommentRow = {
  id: string;
  organization_id: string;
  client_workspace_id: string | null;
  author_id: string;
  content_id: string | null;
  campaign_id: string | null;
  approval_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

function mapComment(row: CommentRow): CollaborationComment {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientWorkspaceId: row.client_workspace_id,
    authorId: row.author_id,
    contentId: row.content_id,
    campaignId: row.campaign_id,
    approvalId: row.approval_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listComments(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    contentId?: string | null;
    campaignId?: string | null;
    approvalId?: string | null;
  }
): Promise<CollaborationComment[]> {
  let query = supabase
    .from("collaboration_comments")
    .select("*")
    .eq("organization_id", input.organizationId)
    .order("created_at", { ascending: true });

  if (input.contentId) query = query.eq("content_id", input.contentId);
  if (input.campaignId) query = query.eq("campaign_id", input.campaignId);
  if (input.approvalId) query = query.eq("approval_id", input.approvalId);

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapComment(row as CommentRow));
}

export async function addComment(
  supabase: SupabaseClient,
  input: {
    ctx: CollaborationContext;
    scope: WorkspaceScope;
    isAgency: boolean;
    body: string;
    contentId?: string | null;
    campaignId?: string | null;
    approvalId?: string | null;
    notifyUserIds?: string[];
  }
): Promise<CollaborationComment> {
  requireCollaborationPermission("comment.create", permissionOptions(input.ctx, input.isAgency));

  const body = sanitizeCommentBody(input.body);

  if (!input.contentId && !input.campaignId && !input.approvalId) {
    throw new CollaborationError("Comment target is required.", "validation_error", 400);
  }

  if (input.contentId) {
    await verifyContentInWorkspace(
      supabase,
      input.contentId,
      input.ctx.organizationId,
      input.scope
    );
  }

  if (input.campaignId) {
    await verifyCampaignInWorkspace(
      supabase,
      input.campaignId,
      input.ctx.organizationId,
      input.scope
    );
  }

  const { data, error } = await supabase
    .from("collaboration_comments")
    .insert({
      organization_id: input.ctx.organizationId,
      client_workspace_id: input.ctx.clientWorkspaceId,
      author_id: input.ctx.userId,
      content_id: input.contentId ?? null,
      campaign_id: input.campaignId ?? null,
      approval_id: input.approvalId ?? null,
      body,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const comment = mapComment(data as CommentRow);

  const entityType = input.contentId
    ? "content"
    : input.campaignId
      ? "campaign"
      : "approval";
  const entityId = input.contentId ?? input.campaignId ?? input.approvalId!;

  await recordActivity(supabase, {
    organizationId: input.ctx.organizationId,
    clientWorkspaceId: input.ctx.clientWorkspaceId,
    actorId: input.ctx.userId,
    entityType,
    entityId,
    action: "comment_added",
    metadata: { commentId: comment.id },
  });

  for (const recipientId of input.notifyUserIds ?? []) {
    if (recipientId === input.ctx.userId) continue;
    await createNotification(supabase, {
      organizationId: input.ctx.organizationId,
      recipientId,
      clientWorkspaceId: input.ctx.clientWorkspaceId,
      type: "comment_added",
      title: "New comment",
      body: body.slice(0, 120),
      entityType,
      entityId,
    });
  }

  return comment;
}

export async function updateComment(
  supabase: SupabaseClient,
  commentId: string,
  ctx: CollaborationContext,
  isAgency: boolean,
  body: string
): Promise<CollaborationComment> {
  const sanitized = sanitizeCommentBody(body);

  const { data: existing, error: fetchError } = await supabase
    .from("collaboration_comments")
    .select("*")
    .eq("id", commentId)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new CollaborationError("Comment not found.", "not_found", 404);

  const isOwn = existing.author_id === ctx.userId;
  if (isOwn) {
    requireCollaborationPermission("comment.edit_own", permissionOptions(ctx, isAgency));
  } else {
    requireCollaborationPermission("comment.moderate", permissionOptions(ctx, isAgency));
  }

  const { data, error } = await supabase
    .from("collaboration_comments")
    .update({ body: sanitized })
    .eq("id", commentId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await recordActivity(supabase, {
    organizationId: ctx.organizationId,
    clientWorkspaceId: ctx.clientWorkspaceId,
    actorId: ctx.userId,
    entityType: "comment",
    entityId: commentId,
    action: "comment_edited",
  });

  return mapComment(data as CommentRow);
}

export async function deleteComment(
  supabase: SupabaseClient,
  commentId: string,
  ctx: CollaborationContext,
  isAgency: boolean
): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from("collaboration_comments")
    .select("author_id")
    .eq("id", commentId)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new CollaborationError("Comment not found.", "not_found", 404);

  const isOwn = existing.author_id === ctx.userId;
  if (isOwn) {
    requireCollaborationPermission("comment.delete_own", permissionOptions(ctx, isAgency));
  } else {
    requireCollaborationPermission("comment.moderate", permissionOptions(ctx, isAgency));
  }

  const { error } = await supabase
    .from("collaboration_comments")
    .delete()
    .eq("id", commentId);

  if (error) throw new Error(error.message);

  await recordActivity(supabase, {
    organizationId: ctx.organizationId,
    clientWorkspaceId: ctx.clientWorkspaceId,
    actorId: ctx.userId,
    entityType: "comment",
    entityId: commentId,
    action: "comment_deleted",
  });
}
