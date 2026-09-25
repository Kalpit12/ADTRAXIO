import { isValidUuid } from "@/lib/assistant/resource-scope";
import type { AssistantContext } from "@/lib/assistant/types";
import type { ExecutionPlanStep } from "./types";

const EMPTY_CLIENT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

export type StaleReason =
  | "content_missing"
  | "content_archived"
  | "account_disconnected"
  | "campaign_missing"
  | "invalid_schedule_time"
  | "post_already_scheduled";

function scopeRowQuery<
  T extends { is: (c: string, v: null) => T; eq: (c: string, v: string) => T },
>(query: T, ctx: AssistantContext): T {
  if (!ctx.isAgency) return query.is("client_workspace_id", null);
  if (ctx.clientWorkspaceId) {
    return query.eq("client_workspace_id", ctx.clientWorkspaceId);
  }
  return query.eq("client_workspace_id", EMPTY_CLIENT_WORKSPACE_ID);
}

export async function verifyContentInWorkspace(
  ctx: AssistantContext,
  contentId: string
): Promise<{ ok: true } | { ok: false; reason: StaleReason }> {
  if (!isValidUuid(contentId)) {
    return { ok: false, reason: "content_missing" };
  }
  let query = ctx.supabase
    .from("content")
    .select("id, status")
    .eq("id", contentId)
    .eq("organization_id", ctx.organizationId);
  query = scopeRowQuery(query, ctx);
  const { data } = await query.maybeSingle();

  if (!data) return { ok: false, reason: "content_missing" };
  if (data.status === "archived") {
    return { ok: false, reason: "content_archived" };
  }
  return { ok: true };
}

export async function verifySocialAccount(
  ctx: AssistantContext,
  accountId: string
): Promise<{ ok: true } | { ok: false; reason: StaleReason }> {
  if (!isValidUuid(accountId)) {
    return { ok: false, reason: "account_disconnected" };
  }
  let query = ctx.supabase
    .from("social_accounts")
    .select("id, status")
    .eq("id", accountId)
    .eq("organization_id", ctx.organizationId);
  query = scopeRowQuery(query, ctx);
  const { data } = await query.maybeSingle();

  if (!data || data.status !== "connected") {
    return { ok: false, reason: "account_disconnected" };
  }
  return { ok: true };
}

export async function verifyCampaign(
  ctx: AssistantContext,
  campaignId: string
): Promise<{ ok: true } | { ok: false; reason: StaleReason }> {
  if (!isValidUuid(campaignId)) {
    return { ok: false, reason: "campaign_missing" };
  }
  let query = ctx.supabase
    .from("campaigns")
    .select("id, status")
    .eq("id", campaignId)
    .eq("organization_id", ctx.organizationId);
  query = scopeRowQuery(query, ctx);
  const { data } = await query.maybeSingle();

  if (!data) return { ok: false, reason: "campaign_missing" };
  return { ok: true };
}

export function validateScheduleIso(scheduledFor: string): boolean {
  const t = new Date(scheduledFor).getTime();
  if (Number.isNaN(t)) return false;
  return t > Date.now();
}

export async function validateStepBeforeExecute(
  ctx: AssistantContext,
  step: ExecutionPlanStep
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (step.type === "create_content" || step.type === "repurpose_content") {
    const ids = step.result?.contentIds ?? [];
    if (ids.length === 0) {
      return { ok: false, message: "No content drafts for this step." };
    }
    for (const id of ids) {
      const check = await verifyContentInWorkspace(ctx, id);
      if (!check.ok) {
        return {
          ok: false,
          message: `Content ${id} is no longer available (${check.reason}).`,
        };
      }
    }
    return { ok: true };
  }

  if (step.type === "create_campaign") {
    if (step.result?.campaignId) {
      const check = await verifyCampaign(ctx, step.result.campaignId);
      if (!check.ok) {
        return { ok: false, message: "Campaign draft is no longer available." };
      }
    }
    return { ok: true };
  }

  if (step.type === "prepare_schedule") {
    for (const item of step.result?.scheduleItems ?? []) {
      if (item.scheduledPostId) {
        const { data } = await ctx.supabase
          .from("scheduled_posts")
          .select("id, status")
          .eq("id", item.scheduledPostId)
          .eq("organization_id", ctx.organizationId)
          .maybeSingle();
        if (data?.status === "scheduled" || data?.status === "published") {
          continue;
        }
      }
      const contentCheck = await verifyContentInWorkspace(ctx, item.contentId);
      if (!contentCheck.ok) {
        return {
          ok: false,
          message: `Schedule content unavailable (${contentCheck.reason}).`,
        };
      }
      const accountCheck = await verifySocialAccount(ctx, item.socialAccountId);
      if (!accountCheck.ok) {
        return {
          ok: false,
          message: "A scheduled social account is disconnected.",
        };
      }
      if (!validateScheduleIso(item.scheduledFor)) {
        return {
          ok: false,
          message: "A schedule time is invalid or in the past.",
        };
      }
    }
    return { ok: true };
  }

  return { ok: true };
}
