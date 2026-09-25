import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreativeBrief, GeneratedCreative } from "@/lib/content/types";
import type { AssistantContext } from "./types";

export async function saveContentDraftFromAssistant(
  ctx: AssistantContext,
  input: {
    brief: CreativeBrief;
    creative: GeneratedCreative;
  }
): Promise<{ contentId: string } | { error: string }> {
  const clientWorkspaceId = ctx.isAgency ? ctx.clientWorkspaceId : null;

  const payload = {
    user_id: ctx.user.id,
    organization_id: ctx.organizationId,
    client_workspace_id: clientWorkspaceId,
    content_type: input.brief.contentType,
    platform: input.brief.platform,
    goal: input.brief.goal,
    audience: input.brief.audience || null,
    tone: input.brief.tone,
    topic: input.brief.topic,
    additional_context: input.brief.additionalContext || null,
    cta: input.creative.cta || input.brief.cta || null,
    hook: input.creative.hook,
    headline: input.creative.headline,
    primary_copy: input.creative.primaryCopy,
    caption: input.creative.caption,
    hashtags: input.creative.hashtags,
    creative_direction: input.creative.creativeDirection,
    status: "draft",
  };

  const { data, error } = await ctx.supabase
    .from("content")
    .insert(payload)
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { contentId: data.id as string };
}

export async function saveManyContentDrafts(
  supabase: SupabaseClient,
  ctx: AssistantContext,
  items: Array<{ brief: CreativeBrief; creative: GeneratedCreative }>
): Promise<{ contentIds: string[]; errors: string[] }> {
  const contentIds: string[] = [];
  const errors: string[] = [];

  for (const item of items) {
    const result = await saveContentDraftFromAssistant(ctx, item);
    if ("error" in result) errors.push(result.error);
    else contentIds.push(result.contentId);
  }

  return { contentIds, errors };
}

export function newDraftIds(count: number): string[] {
  return Array.from({ length: count }, () => randomUUID());
}
