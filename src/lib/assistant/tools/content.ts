import { getContentPerformance } from "@/lib/analytics/service";
import { generateContentWithAI } from "@/lib/ai/generate-content";
import type { CreativeBrief, GeneratedCreative } from "@/lib/content/types";
import { enrichBriefWithBrandBrain } from "./brand-brain";
import { saveContentDraftFromAssistant } from "../content-persistence";
import { ensureOperationalScope } from "../permissions";
import { isValidUuid } from "../resource-scope";
import type { AssistantContext } from "../types";

const EMPTY_CLIENT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

function scopeContentQuery<
  T extends { is: (c: string, v: null) => T; eq: (c: string, v: string) => T },
>(query: T, scope: AssistantContext["scope"]): T {
  if (!scope.isAgency) {
    return query.is("client_workspace_id", null);
  }
  if (scope.clientWorkspaceId) {
    return query.eq("client_workspace_id", scope.clientWorkspaceId);
  }
  return query.eq("client_workspace_id", EMPTY_CLIENT_WORKSPACE_ID);
}

export async function listContentTool(ctx: AssistantContext) {
  ensureOperationalScope(ctx.scope);
  let query = ctx.supabase
    .from("content")
    .select(
      "id, headline, platform, content_type, status, topic, updated_at, created_at"
    )
    .eq("organization_id", ctx.organizationId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(25);

  query = scopeContentQuery(query, ctx.scope);
  const { data, error } = await query;
  if (error) return { error: error.message };
  return data ?? [];
}

export async function getContentTool(
  ctx: AssistantContext,
  args: { contentId: string }
) {
  ensureOperationalScope(ctx.scope);
  const contentId = args.contentId?.trim() ?? "";
  if (!isValidUuid(contentId)) return { error: "Invalid contentId." };

  let query = ctx.supabase
    .from("content")
    .select(
      "id, headline, platform, content_type, goal, topic, caption, primary_copy, hook, status, hashtags, creative_direction, tone, audience, updated_at, created_at"
    )
    .eq("organization_id", ctx.organizationId)
    .eq("id", contentId);

  query = scopeContentQuery(query, ctx.scope);
  const { data, error } = await query.maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Content not found." };

  const [{ data: campaignLink }, { data: approval }, { data: posts }] =
    await Promise.all([
      ctx.supabase
        .from("campaign_content")
        .select("campaign_id, campaigns(name, status, objective)")
        .eq("content_id", contentId)
        .maybeSingle(),
      ctx.supabase
        .from("content_approvals")
        .select("status, requested_at, reviewed_at")
        .eq("content_id", contentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      ctx.supabase
        .from("scheduled_posts")
        .select("id, status, scheduled_for, published_at, platform")
        .eq("content_id", contentId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  let performance: unknown = null;
  try {
    const rows = await getContentPerformance(
      ctx.supabase,
      ctx.organizationId,
      { preset: "30d", scope: ctx.scope }
    );
    performance = rows.find((r) => r.id === contentId) ?? null;
  } catch {
    performance = null;
  }

  const campaign = campaignLink?.campaigns as
    | { name?: string; status?: string; objective?: string }
    | null
    | undefined;

  return {
    content: {
      id: data.id,
      headline: data.headline,
      platform: data.platform,
      contentType: data.content_type,
      goal: data.goal,
      topic: data.topic,
      tone: data.tone,
      audience: data.audience,
      hook: data.hook,
      primaryCopy: data.primary_copy,
      caption: data.caption,
      hashtags: data.hashtags,
      creativeDirection: data.creative_direction,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
    publishing: (posts ?? []).map((p) => ({
      id: p.id,
      platform: p.platform,
      status: p.status,
      scheduledFor: p.scheduled_for,
      publishedAt: p.published_at,
    })),
    campaign: campaignLink
      ? {
          campaignId: campaignLink.campaign_id,
          name: campaign?.name ?? null,
          status: campaign?.status ?? null,
          objective: campaign?.objective ?? null,
        }
      : null,
    approval: approval
      ? {
          status: approval.status,
          requestedAt: approval.requested_at,
          reviewedAt: approval.reviewed_at,
        }
      : null,
    performance,
  };
}

export async function searchContentTool(
  ctx: AssistantContext,
  args: { query: string; limit?: number }
) {
  ensureOperationalScope(ctx.scope);
  const q = args.query?.trim();
  if (!q) return { error: "query is required." };

  let query = ctx.supabase
    .from("content")
    .select("id, headline, platform, topic, status, updated_at")
    .eq("organization_id", ctx.organizationId)
    .neq("status", "archived")
    .or(`headline.ilike.%${q}%,topic.ilike.%${q}%,caption.ilike.%${q}%`)
    .order("updated_at", { ascending: false })
    .limit(Math.min(args.limit ?? 10, 20));

  query = scopeContentQuery(query, ctx.scope);
  const { data, error } = await query;
  if (error) return { error: error.message };
  return data ?? [];
}

export async function generateContentTool(
  ctx: AssistantContext,
  args: {
    contentType?: string;
    goal?: string;
    platform?: string;
    audience?: string;
    tone?: string;
    topic?: string;
    context?: string;
    cta?: string;
    productName?: string;
    productId?: string;
  }
) {
  ensureOperationalScope(ctx.scope);
  const brief: CreativeBrief = {
    contentType: (args.contentType as CreativeBrief["contentType"]) ?? "post",
    goal: (args.goal as CreativeBrief["goal"]) ?? "engagement",
    platform: (args.platform as CreativeBrief["platform"]) ?? "instagram",
    audience: args.audience ?? "",
    tone: (args.tone as CreativeBrief["tone"]) ?? "professional",
    topic: args.topic ?? "",
    additionalContext: args.context ?? "",
    cta: args.cta ?? "",
  };

  if (!brief.topic.trim()) {
    return { error: "topic is required to generate content." };
  }

  const enriched = await enrichBriefWithBrandBrain(ctx, brief, {
    productName: args.productName,
    productId: args.productId,
  });
  const creative = await generateContentWithAI(enriched);
  return { brief: enriched, creative };
}

function briefFromContentRow(row: {
  content_type: string;
  goal: string;
  platform: string;
  audience: string | null;
  tone: string;
  topic: string;
  additional_context?: string | null;
  cta?: string | null;
  hook: string | null;
  headline: string | null;
  primary_copy: string | null;
  caption: string | null;
  creative_direction: string | null;
}): CreativeBrief {
  return {
    contentType: row.content_type as CreativeBrief["contentType"],
    goal: row.goal as CreativeBrief["goal"],
    platform: row.platform as CreativeBrief["platform"],
    audience: row.audience ?? "",
    tone: row.tone as CreativeBrief["tone"],
    topic: row.topic,
    additionalContext: row.additional_context ?? "",
    cta: row.cta ?? "",
  };
}

function creativeFromContentRow(row: {
  hook: string | null;
  headline: string | null;
  primary_copy: string | null;
  cta: string | null;
  caption: string | null;
  hashtags: string[] | null;
  creative_direction: string | null;
}): GeneratedCreative {
  return {
    hook: row.hook ?? "",
    headline: row.headline ?? "",
    primaryCopy: row.primary_copy ?? "",
    cta: row.cta ?? "",
    caption: row.caption ?? "",
    hashtags: row.hashtags ?? [],
    creativeDirection: row.creative_direction ?? "",
  };
}

async function loadContentRow(ctx: AssistantContext, contentId: string) {
  let query = ctx.supabase
    .from("content")
    .select("*")
    .eq("organization_id", ctx.organizationId)
    .eq("id", contentId);
  query = scopeContentQuery(query, ctx.scope);
  const { data, error } = await query.maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Content not found." };
  return { data };
}

export async function repurposeContentTool(
  ctx: AssistantContext,
  args: {
    contentId: string;
    targetPlatform: string;
    format?: string;
  }
) {
  ensureOperationalScope(ctx.scope);
  const contentId = args.contentId?.trim() ?? "";
  if (!isValidUuid(contentId)) return { error: "Invalid contentId." };
  const targetPlatform = args.targetPlatform?.trim();
  if (!targetPlatform) return { error: "targetPlatform is required." };

  const loaded = await loadContentRow(ctx, contentId);
  if ("error" in loaded) return loaded;

  const source = loaded.data;
  const sourceCreative = creativeFromContentRow(source);
  const brief = briefFromContentRow(source);
  brief.platform = targetPlatform as CreativeBrief["platform"];
  brief.additionalContext = [
    `Repurpose from ${source.platform} to ${targetPlatform}.`,
    args.format ? `Format: ${args.format}` : "",
    `Source hook: ${sourceCreative.hook}`,
    `Source copy: ${sourceCreative.primaryCopy}`,
    `Source caption: ${sourceCreative.caption}`,
  ]
    .filter(Boolean)
    .join("\n");

  const enriched = await enrichBriefWithBrandBrain(ctx, brief);
  const creative = await generateContentWithAI(enriched, {
    variationOf: sourceCreative,
  });

  return {
    sourceContentId: contentId,
    targetPlatform,
    format: args.format ?? null,
    brief: enriched,
    creative,
  };
}

export async function generateContentLikeTool(
  ctx: AssistantContext,
  args: {
    contentId: string;
    topic?: string;
    variationCount?: number;
  }
) {
  ensureOperationalScope(ctx.scope);
  const contentId = args.contentId?.trim() ?? "";
  if (!isValidUuid(contentId)) return { error: "Invalid contentId." };

  const loaded = await loadContentRow(ctx, contentId);
  if ("error" in loaded) return loaded;

  const source = loaded.data;
  const sourceCreative = creativeFromContentRow(source);
  const brief = briefFromContentRow(source);
  if (args.topic?.trim()) brief.topic = args.topic.trim();
  brief.additionalContext = [
    "Create new content in the style of the source post below.",
    `Source hook: ${sourceCreative.hook}`,
    `Source headline: ${sourceCreative.headline}`,
    `Source copy: ${sourceCreative.primaryCopy}`,
    `Source caption: ${sourceCreative.caption}`,
  ].join("\n");

  const count = Math.min(Math.max(args.variationCount ?? 1, 1), 3);
  const variations: GeneratedCreative[] = [];

  const enriched = await enrichBriefWithBrandBrain(ctx, brief);
  for (let i = 0; i < count; i += 1) {
    const creative = await generateContentWithAI(enriched, {
      variationOf: sourceCreative,
    });
    variations.push(creative);
  }

  if (count === 1) {
    return {
      sourceContentId: contentId,
      brief: enriched,
      creative: variations[0],
    };
  }

  return {
    sourceContentId: contentId,
    brief: enriched,
    variations,
  };
}

export async function saveGeneratedContentDraftTool(
  ctx: AssistantContext,
  args: {
    brief: CreativeBrief;
    creative: GeneratedCreative;
  }
) {
  ensureOperationalScope(ctx.scope);
  if (!args.brief || !args.creative) {
    return { error: "brief and creative are required." };
  }
  return saveContentDraftFromAssistant(ctx, {
    brief: args.brief,
    creative: args.creative,
  });
}
