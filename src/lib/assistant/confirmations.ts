import { createBrandMemory } from "./brand-brain/service";
import type { MemoryCategory, MemorySource } from "./brand-brain/types";
import { createCampaign } from "@/lib/campaigns/service";
import {
  cancelScheduledPost,
  publishNow,
  schedulePost,
} from "@/lib/publishing/service";
import type { AssistantContext, PendingActionRecord, PendingActionType } from "./types";

const ACTION_TTL_MS = 15 * 60 * 1000;

function mapPendingAction(row: {
  id: string;
  conversation_id: string;
  action_type: string;
  payload: unknown;
  summary: string;
  status: string;
  expires_at: string;
  created_at: string;
}): PendingActionRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    actionType: row.action_type as PendingActionType,
    payload: (row.payload as Record<string, unknown>) ?? {},
    summary: row.summary,
    status: row.status as PendingActionRecord["status"],
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export async function createPendingAction(
  ctx: AssistantContext,
  input: {
    conversationId: string;
    actionType: PendingActionType;
    payload: Record<string, unknown>;
    summary: string;
  }
): Promise<PendingActionRecord> {
  const expiresAt = new Date(Date.now() + ACTION_TTL_MS).toISOString();

  const { data, error } = await ctx.supabase
    .from("ai_pending_actions")
    .insert({
      conversation_id: input.conversationId,
      organization_id: ctx.organizationId,
      client_workspace_id: ctx.clientWorkspaceId,
      user_id: ctx.user.id,
      action_type: input.actionType,
      payload: input.payload,
      summary: input.summary,
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapPendingAction(data);
}

export async function getPendingAction(
  ctx: AssistantContext,
  actionId: string
): Promise<PendingActionRecord | null> {
  const { data, error } = await ctx.supabase
    .from("ai_pending_actions")
    .select("*")
    .eq("id", actionId)
    .eq("user_id", ctx.user.id)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapPendingAction(data);
}

export async function cancelPendingAction(
  ctx: AssistantContext,
  actionId: string
): Promise<void> {
  const { error } = await ctx.supabase
    .from("ai_pending_actions")
    .update({ status: "cancelled" })
    .eq("id", actionId)
    .eq("user_id", ctx.user.id)
    .eq("status", "pending");

  if (error) throw new Error(error.message);
}

export async function confirmPendingAction(
  ctx: AssistantContext,
  actionId: string
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const action = await getPendingAction(ctx, actionId);
  if (!action) return { success: false, error: "Action not found." };
  if (action.status !== "pending") {
    return { success: false, error: "Action is no longer pending." };
  }
  if (new Date(action.expiresAt) < new Date()) {
    await ctx.supabase
      .from("ai_pending_actions")
      .update({ status: "expired" })
      .eq("id", actionId);
    return { success: false, error: "Action expired. Please request again." };
  }

  try {
    const result = await executeConfirmedAction(ctx, action);
    await ctx.supabase
      .from("ai_pending_actions")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", actionId);
    return { success: true, result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Action failed.";
    return { success: false, error: message };
  }
}

async function executeConfirmedAction(
  ctx: AssistantContext,
  action: PendingActionRecord
): Promise<unknown> {
  const payload = action.payload;

  switch (action.actionType) {
    case "publish_post": {
      const result = await publishNow(ctx.supabase, {
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        request: {
          socialAccountId: payload.socialAccountId as string,
          contentId: (payload.contentId as string) ?? null,
          caption: (payload.caption as string) ?? "",
          mediaUrl: (payload.mediaUrl as string) ?? null,
        },
        scope: ctx.scope,
      });
      return result;
    }
    case "schedule_post": {
      const result = await schedulePost(ctx.supabase, {
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        request: {
          socialAccountId: payload.socialAccountId as string,
          contentId: (payload.contentId as string) ?? null,
          caption: (payload.caption as string) ?? "",
          mediaUrl: (payload.mediaUrl as string) ?? null,
          scheduledFor: payload.scheduledFor as string,
          timezone: (payload.timezone as string) ?? "UTC",
        },
        scope: ctx.scope,
      });
      return result;
    }
    case "cancel_post": {
      const result = await cancelScheduledPost(
        ctx.supabase,
        ctx.organizationId,
        payload.postId as string
      );
      return result;
    }
    case "create_campaign": {
      const result = await createCampaign(
        ctx.supabase,
        ctx.organizationId,
        ctx.user.id,
        {
          name: payload.name as string,
          objective:
            (payload.objective as "awareness" | "engagement" | "leads" | "sales") ??
            "awareness",
          description: (payload.description as string) ?? null,
          startDate: (payload.startDate as string) ?? null,
          endDate: (payload.endDate as string) ?? null,
        },
        ctx.scope
      );
      return result;
    }
    case "save_brand_memory": {
      const memory = await createBrandMemory(ctx, {
        category: payload.category as MemoryCategory,
        key: String(payload.key ?? ""),
        value: String(payload.value ?? ""),
        source: "user_confirmed" as MemorySource,
      });
      return { memoryId: memory.id, status: "active" };
    }
    case "execute_optimization": {
      const { executeOptimizationProposal } = await import("@/lib/optimization/executor");
      const result = await executeOptimizationProposal(ctx, String(payload.proposalId ?? ""));
      return result;
    }
    case "rollback_optimization": {
      const { rollbackOptimizationProposal } = await import("@/lib/optimization/executor");
      const result = await rollbackOptimizationProposal(ctx, String(payload.proposalId ?? ""));
      return result;
    }
    default:
      throw new Error(`Unsupported action: ${action.actionType}`);
  }
}
