import type { ContentPlatform, CreativeBrief } from "./types";

export const CREATIVE_WORKFLOW_STEPS = [
  "brief",
  "concept",
  "assets",
  "compose",
  "review",
] as const;

export type CreativeWorkflowStep = (typeof CREATIVE_WORKFLOW_STEPS)[number];

export const CREATIVE_PACKAGE_STATUSES = [
  "draft",
  "generating",
  "ready",
  "needs_changes",
  "saved",
] as const;

export type CreativePackageStatus = (typeof CREATIVE_PACKAGE_STATUSES)[number];

export const ASSET_SLOT_KINDS = ["image", "video", "voice", "sound"] as const;
export type AssetSlotKind = (typeof ASSET_SLOT_KINDS)[number];

export const ASSET_SLOT_STATUSES = [
  "not_created",
  "generating",
  "processing",
  "ready",
  "failed",
] as const;

export type AssetSlotStatus = (typeof ASSET_SLOT_STATUSES)[number];

export interface CreativeConcept {
  creativeAngle: string;
  hook: string;
  headline: string;
  primaryCopy: string;
  cta: string;
  caption: string;
  hashtags: string[];
  visualDirection: string;
  voiceoverDirection: string;
  soundDirection: string;
  suggestedMedia: AssetSlotKind[];
}

export interface CreativeAssetSlot {
  id: string;
  kind: AssetSlotKind;
  label: string;
  status: AssetSlotStatus;
  assetId?: string;
  errorMessage?: string;
}

export interface CreativeCanvasState {
  headline: string;
  caption: string;
  cta: string;
}

export interface CreativeStudioSnapshot {
  workflowStep: CreativeWorkflowStep;
  packageStatus: CreativePackageStatus;
  concept: CreativeConcept | null;
  assetSlots: CreativeAssetSlot[];
  canvas: CreativeCanvasState;
}

export function emptyCreativeStudioSnapshot(): CreativeStudioSnapshot {
  return {
    workflowStep: "brief",
    packageStatus: "draft",
    concept: null,
    assetSlots: [],
    canvas: { headline: "", caption: "", cta: "" },
  };
}

export const SLOT_LABELS: Record<AssetSlotKind, string> = {
  image: "Visual (image)",
  video: "Motion (video)",
  voice: "Voiceover",
  sound: "Sound effect",
};

export function defaultSuggestedMedia(brief: CreativeBrief): AssetSlotKind[] {
  switch (brief.contentType) {
    case "reel":
    case "story":
      return ["image", "video", "voice"];
    case "carousel":
      return ["image", "voice"];
    case "ad_creative":
      return ["image", "video", "voice", "sound"];
    default:
      return ["image", "voice"];
  }
}
