import type { StudioVisualMediaType } from "./visual-types";
import {
  emptyStudioVisualState,
  parseStudioVisualState,
  type StudioVisualState,
} from "./visual-types";

export type { StudioVisualMediaType };

const VISUAL_KEY = "adly_content_studio_visuals";

type VisualStore = Record<string, StudioVisualState>;

function readStore(): VisualStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(VISUAL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as VisualStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: VisualStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VISUAL_KEY, JSON.stringify(store));
}

export function studioVisualStorageKey(
  draftId: string | null,
  sessionId: string
): string {
  return draftId ?? `session:${sessionId}`;
}

export function loadPersistedStudioVisual(
  draftId: string | null,
  sessionId: string
): StudioVisualState {
  const key = studioVisualStorageKey(draftId, sessionId);
  const state = readStore()[key];
  return state ? parseStudioVisualState(state) : emptyStudioVisualState();
}

export function persistStudioVisual(
  draftId: string | null,
  sessionId: string,
  state: StudioVisualState
): void {
  const key = studioVisualStorageKey(draftId, sessionId);
  const store = readStore();
  store[key] = state;
  writeStore(store);
}

export function mergeStudioVisualState(
  current: StudioVisualState,
  asset: {
    assetId: string;
    prompt: string;
    type: StudioVisualState["assets"][number]["type"];
    audioSubtype?: StudioVisualState["assets"][number]["audioSubtype"];
    size?: string;
    aspectRatio?: string;
    durationSeconds?: number;
    voiceId?: string;
  }
): StudioVisualState {
  const createdAt = new Date().toISOString();
  const assets = [
    ...current.assets.filter((a) => a.assetId !== asset.assetId),
    {
      assetId: asset.assetId,
      prompt: asset.prompt,
      type: asset.type,
      audioSubtype: asset.audioSubtype,
      size: asset.size,
      aspectRatio: asset.aspectRatio,
      durationSeconds: asset.durationSeconds,
      voiceId: asset.voiceId,
      createdAt,
    },
  ];
  const activeMediaType =
    asset.type === "audio"
      ? asset.audioSubtype === "sound"
        ? "sound"
        : "voice"
      : asset.type;
  return {
    activeAssetId: asset.assetId,
    activeMediaType,
    assets,
  };
}
