import type { ApprovalStatus } from "@/lib/collaboration/types";
import { isBlockingApprovalStatus } from "@/lib/collaboration/service";
import { getPlatformCapabilities } from "@/lib/publishing/capabilities";
import type { PublishingMediaType, PublishingPlatform } from "@/lib/publishing/types";
import type { CreativeAssetSlot, CreativeStudioSnapshot } from "./creative-studio-types";
import type { CreativeBrief, GeneratedCreative } from "./types";
import type {
  CreativePublishingLink,
  StudioVisualAssetRef,
  StudioVisualState,
} from "./visual-types";
import { conceptToGeneratedCreative } from "./creative-studio";

export type CreativePublishLifecycleStatus =
  | "draft"
  | "ready"
  | "awaiting_approval"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed";

export interface PublishableMediaSelection {
  assetId: string;
  mediaType: PublishingMediaType;
  slotKind: "image" | "video";
  sourceAssetId: string;
}

export function buildGeneratedCreativeFromStudio(
  studio: CreativeStudioSnapshot
): GeneratedCreative | null {
  if (!studio.concept) return null;
  const base = conceptToGeneratedCreative(studio.concept);
  return {
    ...base,
    headline: studio.canvas.headline || base.headline,
    caption: studio.canvas.caption || base.caption,
    cta: studio.canvas.cta || base.cta,
  };
}

export function selectDefaultPublishableSlot(
  slots: CreativeAssetSlot[]
): CreativeAssetSlot | null {
  const ready = slots.filter((s) => s.status === "ready" && s.assetId);
  const image = ready.find((s) => s.kind === "image");
  if (image) return image;
  const video = ready.find((s) => s.kind === "video");
  return video ?? null;
}

export function resolvePublishableMediaAssetId(
  slots: CreativeAssetSlot[],
  preferredAssetId?: string | null
): string | null {
  if (preferredAssetId) {
    const match = slots.find(
      (s) => s.assetId === preferredAssetId && s.status === "ready"
    );
    if (match && (match.kind === "image" || match.kind === "video")) {
      return preferredAssetId;
    }
  }
  const slot = selectDefaultPublishableSlot(slots);
  return slot?.assetId ?? null;
}

export function slotKindToPublishingMediaType(
  kind: CreativeAssetSlot["kind"]
): PublishingMediaType | null {
  if (kind === "image") return "image";
  if (kind === "video") return "video";
  return null;
}

export function assessPlatformMediaSupport(
  platform: PublishingPlatform,
  mediaType: PublishingMediaType
): { supported: boolean; message: string | null } {
  const caps = getPlatformCapabilities(platform);
  if (mediaType === "video" && !caps.supportsVideo) {
    return {
      supported: false,
      message: "Publishing this media type is not available yet.",
    };
  }
  if (mediaType === "image" && !caps.supportsImage) {
    return {
      supported: false,
      message: "Image publishing is not available for this platform.",
    };
  }
  return { supported: true, message: null };
}

export function assessEditSpecPublishingLimitation(
  mediaType: string,
  editSpec: Record<string, unknown> | null
): string | null {
  if (!editSpec || mediaType !== "video" && mediaType !== "audio") {
    return null;
  }
  const operations = editSpec.operations;
  if (!Array.isArray(operations)) return null;
  const hasTrim = operations.some(
    (op) => op && typeof op === "object" && (op as { type?: string }).type === "trim"
  );
  if (hasTrim) {
    return "Trimmed video/audio edits are stored as specifications only. Publishing the trimmed clip is not available yet.";
  }
  return null;
}

export function mapApprovalToCreativeStatus(
  approvalStatus: ApprovalStatus | null
): CreativePublishLifecycleStatus {
  if (!approvalStatus) return "ready";
  if (approvalStatus === "approved") return "ready";
  if (approvalStatus === "rejected") return "awaiting_approval";
  if (isBlockingApprovalStatus(approvalStatus)) return "awaiting_approval";
  return "ready";
}

export function publishingBlockedByApproval(
  approvalStatus: ApprovalStatus | null
): boolean {
  if (!approvalStatus) return false;
  if (approvalStatus === "approved" || approvalStatus === "cancelled") {
    return false;
  }
  return isBlockingApprovalStatus(approvalStatus);
}

export function mapScheduledStatusToCreative(
  status: string
): CreativePublishLifecycleStatus {
  switch (status) {
    case "scheduled":
      return "scheduled";
    case "publishing":
      return "publishing";
    case "published":
      return "published";
    case "failed":
      return "failed";
    default:
      return "ready";
  }
}

export function hasDuplicateActiveSchedule(
  posts: { contentId: string | null; socialAccountId: string; status: string }[],
  contentId: string,
  socialAccountId: string
): boolean {
  return posts.some(
    (post) =>
      post.contentId === contentId &&
      post.socialAccountId === socialAccountId &&
      (post.status === "scheduled" || post.status === "publishing")
  );
}

export function attachCreativePublishingLink(
  visual: StudioVisualState,
  link: CreativePublishingLink
): StudioVisualState {
  return {
    ...visual,
    creativePublishing: link,
  };
}

export function supplementaryAudioAssetIds(
  slots: CreativeAssetSlot[]
): { voiceAssetIds: string[]; soundAssetIds: string[] } {
  const voiceAssetIds: string[] = [];
  const soundAssetIds: string[] = [];
  for (const slot of slots) {
    if (slot.status !== "ready" || !slot.assetId) continue;
    if (slot.kind === "voice") voiceAssetIds.push(slot.assetId);
    if (slot.kind === "sound") soundAssetIds.push(slot.assetId);
  }
  return { voiceAssetIds, soundAssetIds };
}

export function buildStudioVisualForCampaignContent(input: {
  studio: CreativeStudioSnapshot;
  visualAssets: StudioVisualAssetRef[];
  link: CreativePublishingLink;
  brief: CreativeBrief;
}): StudioVisualState {
  const active =
    input.link.selectedMediaAssetId ??
    input.visualAssets[0]?.assetId ??
    null;
  return {
    activeAssetId: active,
    activeMediaType: "image",
    assets: input.visualAssets,
    creativeStudio: input.studio,
    creativePublishing: input.link,
  };
}

export function sanitizeCampaignIntegrationError(message: string): string {
  return message
    .replace(/Bearer\s+\S+/gi, "[redacted]")
    .replace(/sk-[a-zA-Z0-9]+/g, "[redacted]")
    .slice(0, 280);
}
