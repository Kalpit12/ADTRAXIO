import {
  getCampaign,
  getCampaignPerformance,
  listCampaigns,
} from "@/lib/campaigns/service";
import { ensureOperationalScope } from "../permissions";
import type { AssistantContext } from "../types";

export async function listCampaignsTool(ctx: AssistantContext) {
  ensureOperationalScope(ctx.scope);
  const campaigns = await listCampaigns(ctx.supabase, ctx.organizationId, {
    scope: ctx.scope,
    includeArchived: false,
  });
  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    objective: c.objective,
    startDate: c.startDate,
    endDate: c.endDate,
    contentCount: c.contentCount,
    accountCount: c.accountCount,
    platforms: c.platforms,
  }));
}

export async function getCampaignTool(
  ctx: AssistantContext,
  args: { campaignId: string }
) {
  ensureOperationalScope(ctx.scope);
  if (!args.campaignId?.trim()) {
    return { error: "campaignId is required." };
  }
  const campaign = await getCampaign(
    ctx.supabase,
    ctx.organizationId,
    args.campaignId,
    ctx.scope
  );
  if (!campaign) return { error: "Campaign not found." };
  return campaign;
}

export async function getCampaignPerformanceTool(
  ctx: AssistantContext,
  args: { campaignId: string }
) {
  ensureOperationalScope(ctx.scope);
  if (!args.campaignId?.trim()) {
    return { error: "campaignId is required." };
  }
  try {
    const performance = await getCampaignPerformance(
      ctx.supabase,
      ctx.organizationId,
      args.campaignId,
      ctx.scope
    );
    return performance;
  } catch {
    return { error: "Campaign not found or performance unavailable." };
  }
}
