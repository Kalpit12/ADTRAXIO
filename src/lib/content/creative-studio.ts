import type { CreativeBrief, GeneratedCreative } from "./types";
import type {
  AssetSlotKind,
  CreativeAssetSlot,
  CreativeConcept,
  CreativePackageStatus,
  CreativeStudioSnapshot,
} from "./creative-studio-types";
import {
  ASSET_SLOT_KINDS,
  defaultSuggestedMedia,
  emptyCreativeStudioSnapshot,
  SLOT_LABELS,
} from "./creative-studio-types";
import type { StudioVisualAssetRef, StudioVisualState } from "./visual-types";
import { parseStudioVisualState } from "./visual-types";

export function parseCreativeConcept(raw: unknown): CreativeConcept | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const suggested = Array.isArray(r.suggestedMedia)
    ? r.suggestedMedia.filter((k): k is AssetSlotKind =>
        ASSET_SLOT_KINDS.includes(k as AssetSlotKind)
      )
    : [];
  if (
    typeof r.hook !== "string" ||
    typeof r.headline !== "string" ||
    typeof r.primaryCopy !== "string"
  ) {
    return null;
  }
  return {
    creativeAngle: typeof r.creativeAngle === "string" ? r.creativeAngle : "",
    hook: r.hook,
    headline: r.headline,
    primaryCopy: r.primaryCopy,
    cta: typeof r.cta === "string" ? r.cta : "",
    caption: typeof r.caption === "string" ? r.caption : "",
    hashtags: Array.isArray(r.hashtags)
      ? r.hashtags.map((t) => String(t).replace(/^#/, ""))
      : [],
    visualDirection: typeof r.visualDirection === "string" ? r.visualDirection : "",
    voiceoverDirection:
      typeof r.voiceoverDirection === "string" ? r.voiceoverDirection : "",
    soundDirection: typeof r.soundDirection === "string" ? r.soundDirection : "",
    suggestedMedia: suggested.length > 0 ? suggested : ["image"],
  };
}

export function conceptToGeneratedCreative(concept: CreativeConcept): GeneratedCreative {
  return {
    hook: concept.hook,
    headline: concept.headline,
    primaryCopy: concept.primaryCopy,
    cta: concept.cta,
    caption: concept.caption,
    hashtags: concept.hashtags,
    creativeDirection: concept.visualDirection,
  };
}

export function buildAssetPlanFromConcept(concept: CreativeConcept): CreativeAssetSlot[] {
  const kinds = concept.suggestedMedia.length
    ? concept.suggestedMedia
    : (["image"] as AssetSlotKind[]);
  return kinds.map((kind) => ({
    id: `slot-${kind}`,
    kind,
    label: SLOT_LABELS[kind],
    status: "not_created",
  }));
}

export function buildDefaultAssetPlan(
  concept: CreativeConcept | null,
  brief?: CreativeBrief
): CreativeAssetSlot[] {
  if (concept) {
    return buildAssetPlanFromConcept(concept);
  }
  const kinds = brief ? defaultSuggestedMedia(brief) : (["image"] as AssetSlotKind[]);
  return kinds.map((kind) => ({
    id: `slot-${kind}`,
    kind,
    label: SLOT_LABELS[kind],
    status: "not_created",
  }));
}

export function updateAssetSlot(
  slots: CreativeAssetSlot[],
  slotId: string,
  patch: Partial<CreativeAssetSlot>
): CreativeAssetSlot[] {
  return slots.map((s) => (s.id === slotId ? { ...s, ...patch } : s));
}

export function removeAssetSlot(
  slots: CreativeAssetSlot[],
  slotId: string
): CreativeAssetSlot[] {
  return slots.filter((s) => s.id !== slotId);
}

export function derivePackageStatus(
  snapshot: CreativeStudioSnapshot
): CreativePackageStatus {
  if (snapshot.packageStatus === "saved") return "saved";
  if (snapshot.packageStatus === "generating") return "generating";
  const anyGenerating = snapshot.assetSlots.some(
    (s) => s.status === "generating" || s.status === "processing"
  );
  if (anyGenerating) return "generating";
  const anyFailed = snapshot.assetSlots.some((s) => s.status === "failed");
  const anyReady = snapshot.assetSlots.some((s) => s.status === "ready");
  if (anyFailed && anyReady) return "needs_changes";
  if (anyFailed && !anyReady) return "needs_changes";
  if (snapshot.concept && anyReady) return "ready";
  if (snapshot.concept) return "draft";
  return snapshot.packageStatus;
}

export function syncVisualAssetsFromSlots(
  slots: CreativeAssetSlot[],
  existing: StudioVisualAssetRef[]
): StudioVisualAssetRef[] {
  const ready = slots.filter((s) => s.status === "ready" && s.assetId);
  const merged = [...existing];
  for (const slot of ready) {
    if (!slot.assetId) continue;
    const type =
      slot.kind === "image"
        ? "image"
        : slot.kind === "video"
          ? "video"
          : "audio";
    const audioSubtype =
      slot.kind === "voice"
        ? "voice"
        : slot.kind === "sound"
          ? "sound"
          : undefined;
    const idx = merged.findIndex((a) => a.assetId === slot.assetId);
    const entry: StudioVisualAssetRef = {
      assetId: slot.assetId,
      prompt: slot.label,
      type,
      audioSubtype,
      createdAt: new Date().toISOString(),
    };
    if (idx >= 0) merged[idx] = { ...merged[idx], ...entry };
    else merged.push(entry);
  }
  return merged;
}

export function parseCreativeStudioSnapshot(
  raw: unknown
): CreativeStudioSnapshot {
  if (!raw || typeof raw !== "object") {
    return emptyCreativeStudioSnapshot();
  }
  const c = raw as Record<string, unknown>;
  const concept = parseCreativeConcept(c.concept);
  const assetSlots = Array.isArray(c.assetSlots)
    ? (c.assetSlots as CreativeAssetSlot[])
    : [];
  const canvas =
    c.canvas && typeof c.canvas === "object"
      ? {
          headline: String((c.canvas as Record<string, unknown>).headline ?? ""),
          caption: String((c.canvas as Record<string, unknown>).caption ?? ""),
          cta: String((c.canvas as Record<string, unknown>).cta ?? ""),
        }
      : emptyCreativeStudioSnapshot().canvas;

  return {
    workflowStep:
      c.workflowStep === "concept" ||
      c.workflowStep === "assets" ||
      c.workflowStep === "compose" ||
      c.workflowStep === "review"
        ? c.workflowStep
        : "brief",
    packageStatus:
      c.packageStatus === "generating" ||
      c.packageStatus === "ready" ||
      c.packageStatus === "needs_changes" ||
      c.packageStatus === "saved"
        ? c.packageStatus
        : "draft",
    concept,
    assetSlots,
    canvas,
  };
}

export function parseCreativeStudioFromVisual(
  raw: unknown
): CreativeStudioSnapshot {
  if (!raw || typeof raw !== "object") {
    return emptyCreativeStudioSnapshot();
  }
  const record = raw as Record<string, unknown>;
  const cs = record.creativeStudio;
  if (!cs || typeof cs !== "object") {
    return emptyCreativeStudioSnapshot();
  }
  return parseCreativeStudioSnapshot(cs);
}

export function attachCreativeStudioToVisual(
  visual: StudioVisualState,
  studio: CreativeStudioSnapshot
): StudioVisualState {
  return {
    ...visual,
    creativeStudio: studio,
  };
}

export function studioVisualWithCreative(
  visual: StudioVisualState,
  studio: CreativeStudioSnapshot
): Record<string, unknown> {
  return {
    ...visual,
    creativeStudio: studio,
  };
}
