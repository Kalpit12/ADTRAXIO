import { getCampaign, getCampaignPerformance } from "@/lib/campaigns/service";
import { listRecommendations } from "@/lib/intelligence/recommendations";
import { ensureOperationalScope } from "../permissions";
import { isValidUuid } from "../resource-scope";
import type { AssistantContext } from "../types";

export async function getCampaignContextTool(
  ctx: AssistantContext,
  args: { campaignId: string }
) {
  ensureOperationalScope(ctx.scope);
  const campaignId = args.campaignId?.trim() ?? "";
  if (!isValidUuid(campaignId)) return { error: "Invalid campaignId." };

  const campaign = await getCampaign(
    ctx.supabase,
    ctx.organizationId,
    campaignId,
    ctx.scope
  );
  if (!campaign) return { error: "Campaign not found." };

  let performance: unknown = null;
  try {
    performance = await getCampaignPerformance(
      ctx.supabase,
      ctx.organizationId,
      campaignId,
      ctx.scope
    );
  } catch {
    performance = { error: "Performance data unavailable." };
  }

  const recommendations = await listRecommendations(
    ctx.supabase,
    ctx.organizationId,
    ctx.scope,
    { status: "new", limit: 10 }
  );

  const relatedRecommendations = recommendations.filter((rec) => {
    const evidence = rec.evidence ?? [];
    return evidence.some((e) => e.includes(campaignId)) || rec.title.toLowerCase().includes(campaign.name.toLowerCase());
  });

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      objective: campaign.objective,
      status: campaign.status,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      platforms: campaign.platforms,
      contentCount: campaign.contentCount,
      accountCount: campaign.accountCount,
    },
    attachedContent: campaign.content,
    attachedAccounts: campaign.accounts,
    publishingResults: campaign.publishing,
    performance,
    recommendations: relatedRecommendations.slice(0, 5).map((r) => ({
      id: r.id,
      title: r.title,
      observation: r.observation,
      recommendation: r.recommendation,
      priority: r.priority,
    })),
  };
}
