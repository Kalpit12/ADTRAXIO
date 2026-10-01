import type { EditorDraftState } from "./types";

const PREFIX = "adly_media_editor_draft_";

export function draftKey(assetId: string): string {
  return `${PREFIX}${assetId}`;
}

export function loadEditorDraft(assetId: string): EditorDraftState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(draftKey(assetId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EditorDraftState;
    if (parsed.assetId !== assetId || !Array.isArray(parsed.operations)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveEditorDraft(draft: EditorDraftState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(draftKey(draft.assetId), JSON.stringify(draft));
}

export function clearEditorDraft(assetId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(draftKey(assetId));
}

export function shouldRestoreDraft(
  draft: EditorDraftState,
  savedVersion: number
): boolean {
  return draft.version > savedVersion;
}
