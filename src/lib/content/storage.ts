import type { ContentDraft, ContentDraftSummary } from "./types";

const DRAFTS_KEY = "adly_content_drafts";

function readDrafts(): ContentDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ContentDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDrafts(drafts: ContentDraft[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export function listLocalDrafts(): ContentDraftSummary[] {
  return readDrafts()
    .map((draft) => ({
      id: draft.id,
      headline: draft.creative.headline || null,
      platform: draft.brief.platform,
      contentType: draft.brief.contentType,
      status: draft.status,
      updatedAt: draft.updatedAt,
    }))
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 8);
}

export function getLocalDraft(id: string): ContentDraft | null {
  return readDrafts().find((draft) => draft.id === id) ?? null;
}

export function saveLocalDraft(draft: ContentDraft): ContentDraft {
  const drafts = readDrafts();
  const index = drafts.findIndex((item) => item.id === draft.id);
  if (index >= 0) {
    drafts[index] = draft;
  } else {
    drafts.unshift(draft);
  }
  writeDrafts(drafts.slice(0, 50));
  return draft;
}

export function createLocalDraftId(): string {
  return `local-${crypto.randomUUID()}`;
}
