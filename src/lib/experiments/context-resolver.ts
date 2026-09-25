import type { AssistantContext } from "@/lib/assistant/types";
import { getConnectedAccounts } from "@/lib/social/service";
import type { ExperimentContextSnapshot, ExperimentRecord, ExperimentVariantRecord } from "./types";

export interface ResolvedExperimentContext {
  platform: string | null;
  audienceContext: Record<string, unknown>;
  platformContext: Record<string, unknown>;
  contentContext: Record<string, unknown>;
  missing: string[];
}

export async function resolveExperimentContext(
  ctx: AssistantContext,
  experiment: ExperimentRecord,
  variants: ExperimentVariantRecord[]
): Promise<ResolvedExperimentContext> {
  const missing: string[] = [];
  let platform = experiment.platform;

  const accounts = await getConnectedAccounts(
    ctx.supabase,
    ctx.organizationId,
    ctx.scope
  ).catch(() => []);

  const connectedPlatforms = accounts
    .filter((a) => a.status === "connected")
    .map((a) => a.platform);

  if (!platform && connectedPlatforms.length === 1) {
    platform = connectedPlatforms[0];
  }
  if (!platform) missing.push("platform");

  const platformContext: Record<string, unknown> = {
    connectedPlatforms,
    selectedPlatform: platform,
  };

  const contentTypes: string[] = [];
  const contentTopics: string[] = [];
  let campaignObjective: string | null = null;
  for (const v of variants) {
    if (v.contentId) {
      const { data } = await ctx.supabase
        .from("content")
        .select("id, caption, content_type, status")
        .eq("id", v.contentId)
        .eq("organization_id", ctx.organizationId)
        .maybeSingle();
      if (data) {
        if (data.content_type) contentTypes.push(String(data.content_type));
        const cap = String(data.caption ?? "").slice(0, 120);
        if (cap) contentTopics.push(cap);
      } else {
        missing.push(`content:${v.variantKey}`);
      }
    }
    if (v.campaignId) {
      const { data: camp } = await ctx.supabase
        .from("campaigns")
        .select("id, name, objective")
        .eq("id", v.campaignId)
        .eq("organization_id", ctx.organizationId)
        .maybeSingle();
      if (camp?.objective) campaignObjective = String(camp.objective);
    }
  }

  const contentContext: Record<string, unknown> = {
    variantContentIds: variants.map((v) => v.contentId).filter(Boolean),
    contentTypes: contentTypes.length ? [...new Set(contentTypes)] : null,
    topics: contentTopics.length ? contentTopics : null,
    goal: campaignObjective ?? experiment.objective,
  };
  if (!contentTypes.length && !variants.some((v) => v.contentId)) {
    missing.push("variant_content");
  }

  const audienceContext: Record<string, unknown> = {
    workspaceId: ctx.clientWorkspaceId,
    organizationId: ctx.organizationId,
    note: experiment.hypothesis ? "derived_from_hypothesis" : null,
  };

  return {
    platform,
    audienceContext,
    platformContext,
    contentContext,
    missing,
  };
}

export function buildContextSnapshot(
  experiment: ExperimentRecord,
  variants: ExperimentVariantRecord[],
  resolved: ResolvedExperimentContext
): ExperimentContextSnapshot {
  return {
    version: 1,
    frozenAt: new Date().toISOString(),
    objective: experiment.objective,
    hypothesis: experiment.hypothesis,
    platform: resolved.platform ?? experiment.platform,
    successMetric: experiment.successMetric,
    secondaryMetrics: experiment.secondaryMetrics,
    audienceContext: resolved.audienceContext,
    platformContext: resolved.platformContext,
    contentContext: resolved.contentContext,
    variants: variants.map((v) => ({
      variantKey: v.variantKey,
      name: v.name,
      contentId: v.contentId,
      campaignId: v.campaignId,
      scheduledPostId: v.scheduledPostId,
    })),
  };
}
