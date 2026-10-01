import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceScope } from "@/lib/workspaces/scope";
import { attachCampaignContent } from "@/lib/campaigns/service";
import { CampaignValidationError } from "@/lib/campaigns/validation";
import { getLatestContentApproval } from "@/lib/collaboration/content-approvals";
import type { ApprovalStatus } from "@/lib/collaboration/types";
import { assessAiMediaAssetForPublishing } from "@/lib/publishing/assess-ai-asset";
import { PublishingError } from "@/lib/publishing/errors";
import type { CreativeStudioSnapshot } from "./creative-studio-types";
import {
  assessPlatformMediaSupport,
  buildGeneratedCreativeFromStudio,
  buildStudioVisualForCampaignContent,
  mapApprovalToCreativeStatus,
  publishingBlockedByApproval,
  resolvePublishableMediaAssetId,
  slotKindToPublishingMediaType,
  supplementaryAudioAssetIds,
} from "./creative-campaign";
import type { CreativeBrief } from "./types";
import type { StudioVisualAssetRef } from "./visual-types";

export interface PrepareCreativeCampaignInput {
  supabase: SupabaseClient;
  organizationId: string;
  userId: string;
  clientWorkspaceId: string | null;
  scope: WorkspaceScope;
  campaignId: string;
  brief: CreativeBrief;
  studio: CreativeStudioSnapshot;
  visualAssets: StudioVisualAssetRef[];
  selectedMediaAssetId?: string | null;
}

export interface PrepareCreativeCampaignResult {
  contentId: string;
  campaignId: string;
  creativeStatus: string;
  approvalStatus: ApprovalStatus | null;
  publishBlocked: boolean;
  publishBlockReason: string | null;
  media: {
    assetId: string;
    sourceAssetId: string;
    mediaType: "image" | "video";
    /** True when asset can be staged at schedule/publish time (no public copy yet). */
    publishReady: boolean;
  } | null;
  mediaLimitation: string | null;
  supplementary: {
    voiceAssetIds: string[];
    soundAssetIds: string[];
  };
}

async function verifyCampaignActive(
  supabase: SupabaseClient,
  campaignId: string,
  organizationId: string,
  scope: WorkspaceScope
): Promise<void> {
  let query = supabase
    .from("campaigns")
    .select("id, status")
    .eq("id", campaignId)
    .eq("organization_id", organizationId);

  if (!scope.isAgency) {
    query = query.is("client_workspace_id", null);
  } else if (scope.clientWorkspaceId) {
    query = query.eq("client_workspace_id", scope.clientWorkspaceId);
  } else {
    query = query.eq(
      "client_workspace_id",
      "00000000-0000-0000-0000-000000000000"
    );
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new CampaignValidationError("Campaign not found.");
  }
  if (data.status === "archived") {
    throw new CampaignValidationError("This campaign is archived.");
  }
}

export async function prepareCreativeForCampaign(
  input: PrepareCreativeCampaignInput
): Promise<PrepareCreativeCampaignResult> {
  await verifyCampaignActive(
    input.supabase,
    input.campaignId,
    input.organizationId,
    input.scope
  );

  const creative = buildGeneratedCreativeFromStudio(input.studio);
  if (!creative) {
    throw new CampaignValidationError("Creative concept is required.");
  }

  const mediaAssetId = resolvePublishableMediaAssetId(
    input.studio.assetSlots,
    input.selectedMediaAssetId
  );

  if (
    mediaAssetId &&
    !input.visualAssets.some((a) => a.assetId === mediaAssetId) &&
    !input.studio.assetSlots.some(
      (s) => s.assetId === mediaAssetId && s.status === "ready"
    )
  ) {
    throw new CampaignValidationError(
      "Selected media is not part of this creative package."
    );
  }

  const link = {
    campaignId: input.campaignId,
    contentId: "",
    selectedMediaAssetId: mediaAssetId,
    updatedAt: new Date().toISOString(),
  };

  const studioVisual = buildStudioVisualForCampaignContent({
    studio: input.studio,
    visualAssets: input.visualAssets,
    link,
    brief: input.brief,
  });

  const { data: inserted, error: insertError } = await input.supabase
    .from("content")
    .insert({
      user_id: input.userId,
      organization_id: input.organizationId,
      client_workspace_id: input.clientWorkspaceId,
      content_type: input.brief.contentType,
      platform: input.brief.platform,
      goal: input.brief.goal,
      audience: input.brief.audience || null,
      tone: input.brief.tone,
      topic: input.brief.topic,
      additional_context: input.brief.additionalContext || null,
      cta: creative.cta || input.brief.cta || null,
      hook: creative.hook,
      headline: creative.headline,
      primary_copy: creative.primaryCopy,
      caption: creative.caption,
      hashtags: creative.hashtags,
      creative_direction: creative.creativeDirection,
      studio_visual: {
        ...studioVisual,
        creativePublishing: {
          ...link,
          contentId: "pending",
        },
      },
      status: "draft",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? "Unable to create content.");
  }

  const contentId = inserted.id as string;
  link.contentId = contentId;

  await input.supabase
    .from("content")
    .update({
      studio_visual: buildStudioVisualForCampaignContent({
        studio: input.studio,
        visualAssets: input.visualAssets,
        link,
        brief: input.brief,
      }),
    })
    .eq("id", contentId)
    .eq("organization_id", input.organizationId);

  await attachCampaignContent(
    input.supabase,
    input.organizationId,
    input.campaignId,
    contentId,
    input.scope
  );

  const approval = await getLatestContentApproval(
    input.supabase,
    contentId,
    input.organizationId
  );

  const platformSupport = input.brief.platform === "facebook" ||
    input.brief.platform === "instagram"
    ? assessPlatformMediaSupport(
        input.brief.platform,
        mediaAssetId
          ? slotKindToPublishingMediaType(
              input.studio.assetSlots.find((s) => s.assetId === mediaAssetId)
                ?.kind ?? "image"
            ) ?? "image"
          : "image"
      )
    : { supported: false, message: "Only Facebook and Instagram are supported for publishing." };

  let staged: PrepareCreativeCampaignResult["media"] = null;
  let mediaLimitation: string | null = null;

  if (!mediaAssetId) {
    mediaLimitation = "Add a ready image or video asset before publishing.";
  } else if (!platformSupport.supported) {
    mediaLimitation = platformSupport.message;
  } else {
    try {
      const result = await assessAiMediaAssetForPublishing(input.supabase, {
        assetId: mediaAssetId,
        organizationId: input.organizationId,
        clientWorkspaceId: input.clientWorkspaceId,
      });
      staged = {
        assetId: result.assetId,
        sourceAssetId: result.sourceAssetId,
        mediaType: result.mediaType,
        publishReady: true,
      };
    } catch (error) {
      if (error instanceof PublishingError) {
        mediaLimitation = error.message;
      } else {
        mediaLimitation = "Unable to prepare media for publishing.";
      }
    }
  }

  const publishBlocked = publishingBlockedByApproval(approval?.status ?? null);
  const publishBlockReason = publishBlocked
    ? "Content must be approved before publishing."
    : null;

  return {
    contentId,
    campaignId: input.campaignId,
    creativeStatus: mapApprovalToCreativeStatus(approval?.status ?? null),
    approvalStatus: approval?.status ?? null,
    publishBlocked,
    publishBlockReason,
    media: staged,
    mediaLimitation,
    supplementary: supplementaryAudioAssetIds(input.studio.assetSlots),
  };
}
