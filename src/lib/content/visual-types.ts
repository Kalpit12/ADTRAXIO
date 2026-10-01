import type { CreativeStudioSnapshot } from "./creative-studio-types";

export interface CreativePublishingLink {
  campaignId: string;
  contentId: string;
  selectedMediaAssetId: string | null;
  updatedAt: string;
}

export type StudioAssetKind = "image" | "video" | "audio";
export type StudioAudioSubtype = "voice" | "sound";
export type StudioPanelMode = "image" | "video" | "voice" | "sound";

/** @deprecated Use StudioPanelMode for UI; kept for gradual migration. */
export type StudioVisualMediaType = "image" | "video";

export interface StudioVisualAssetRef {
  assetId: string;
  prompt: string;
  type: StudioAssetKind;
  audioSubtype?: StudioAudioSubtype;
  size?: string;
  aspectRatio?: string;
  durationSeconds?: number;
  voiceId?: string;
  createdAt: string;
}

export interface StudioVisualState {
  activeAssetId: string | null;
  activeMediaType?: StudioPanelMode;
  assets: StudioVisualAssetRef[];
  creativeStudio?: CreativeStudioSnapshot;
  creativePublishing?: CreativePublishingLink;
}

export const IMAGE_SIZE_OPTIONS = [
  { id: "1024x1024", label: "Square", description: "1:1" },
  { id: "1024x1792", label: "Portrait", description: "9:16" },
  { id: "1792x1024", label: "Landscape", description: "16:9" },
] as const;

export type ImageSizeOption = (typeof IMAGE_SIZE_OPTIONS)[number]["id"];

export const VIDEO_ASPECT_OPTIONS = [
  { id: "16:9", label: "Landscape", description: "16:9" },
  { id: "9:16", label: "Portrait", description: "9:16" },
  { id: "1:1", label: "Square", description: "1:1" },
] as const;

export type VideoAspectOption = (typeof VIDEO_ASPECT_OPTIONS)[number]["id"];

export const VIDEO_DURATION_OPTIONS = [
  { id: "4", label: "4 seconds" },
  { id: "6", label: "6 seconds" },
  { id: "8", label: "8 seconds" },
] as const;

export type VideoDurationOption = (typeof VIDEO_DURATION_OPTIONS)[number]["id"];

export const VOICE_PRESET_OPTIONS = [
  { id: "21m00Tcm4TlvDq8ikWAM", label: "Default narrator" },
] as const;

export type VoicePresetOption = (typeof VOICE_PRESET_OPTIONS)[number]["id"];

export const SOUND_DURATION_OPTIONS = [
  { id: "3", label: "3 seconds" },
  { id: "5", label: "5 seconds" },
  { id: "10", label: "10 seconds" },
] as const;

export type SoundDurationOption = (typeof SOUND_DURATION_OPTIONS)[number]["id"];

export function emptyStudioVisualState(): StudioVisualState {
  return { activeAssetId: null, activeMediaType: "image", assets: [] };
}

function parseAssetKind(value: unknown): StudioAssetKind {
  if (value === "video") return "video";
  if (value === "audio") return "audio";
  return "image";
}

function parsePanelMode(value: unknown): StudioPanelMode {
  if (
    value === "video" ||
    value === "voice" ||
    value === "sound" ||
    value === "image"
  ) {
    return value;
  }
  return "image";
}

export function panelModeMatchesAsset(
  mode: StudioPanelMode,
  asset: StudioVisualAssetRef
): boolean {
  if (mode === "image") return asset.type === "image";
  if (mode === "video") return asset.type === "video";
  if (mode === "voice") {
    return asset.type === "audio" && (asset.audioSubtype ?? "voice") === "voice";
  }
  return asset.type === "audio" && asset.audioSubtype === "sound";
}

export function parseStudioVisualState(raw: unknown): StudioVisualState {
  if (!raw || typeof raw !== "object") {
    return emptyStudioVisualState();
  }
  const record = raw as Record<string, unknown>;
  const activeAssetId =
    typeof record.activeAssetId === "string" ? record.activeAssetId : null;
  const activeMediaType = parsePanelMode(record.activeMediaType);
  const assets = Array.isArray(record.assets)
    ? record.assets
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const a = item as Record<string, unknown>;
          if (typeof a.assetId !== "string" || typeof a.prompt !== "string") {
            return null;
          }
          const type = parseAssetKind(a.type);
          const audioSubtype =
            a.audioSubtype === "sound"
              ? "sound"
              : a.audioSubtype === "voice" || type === "audio"
                ? "voice"
                : undefined;
          return {
            assetId: a.assetId,
            prompt: a.prompt,
            type,
            audioSubtype: type === "audio" ? audioSubtype : undefined,
            size: typeof a.size === "string" ? a.size : undefined,
            aspectRatio:
              typeof a.aspectRatio === "string" ? a.aspectRatio : undefined,
            durationSeconds:
              typeof a.durationSeconds === "number"
                ? a.durationSeconds
                : undefined,
            voiceId: typeof a.voiceId === "string" ? a.voiceId : undefined,
            createdAt:
              typeof a.createdAt === "string"
                ? a.createdAt
                : new Date().toISOString(),
          };
        })
        .filter(Boolean) as StudioVisualAssetRef[]
    : [];
  const creativeStudio =
    record.creativeStudio && typeof record.creativeStudio === "object"
      ? (record.creativeStudio as CreativeStudioSnapshot)
      : undefined;
  const creativePublishing = parseCreativePublishingLink(record.creativePublishing);
  return {
    activeAssetId,
    activeMediaType,
    assets,
    creativeStudio,
    creativePublishing,
  };
}

function parseCreativePublishingLink(
  raw: unknown
): CreativePublishingLink | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.campaignId !== "string" ||
    typeof r.contentId !== "string" ||
    typeof r.updatedAt !== "string"
  ) {
    return undefined;
  }
  return {
    campaignId: r.campaignId,
    contentId: r.contentId,
    selectedMediaAssetId:
      typeof r.selectedMediaAssetId === "string"
        ? r.selectedMediaAssetId
        : null,
    updatedAt: r.updatedAt,
  };
}

export function getActiveStudioVisualAsset(
  state: StudioVisualState
): StudioVisualAssetRef | null {
  if (!state.activeAssetId) return null;
  return state.assets.find((a) => a.assetId === state.activeAssetId) ?? null;
}

export function contentPreviewMediaType(
  asset: StudioVisualAssetRef | null
): "image" | "video" | "audio" | null {
  if (!asset) return null;
  if (asset.type === "image") return "image";
  if (asset.type === "video") return "video";
  if (asset.type === "audio") return "audio";
  return null;
}
