import type { EditOperation } from "./types";
import type { PublicMediaAsset } from "@/lib/ai/media/types";

export interface EditorBootstrap {
  asset: PublicMediaAsset;
  url: string;
  rootSourceAssetId: string;
}

export async function fetchEditorBootstrap(
  assetId: string
): Promise<EditorBootstrap> {
  const response = await fetch(`/api/ai/media/assets/${assetId}/editor`);
  const payload = (await response.json()) as EditorBootstrap & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to load editor.");
  }
  return payload;
}

export interface SaveEditResult {
  asset: PublicMediaAsset;
  rendered: boolean;
}

export async function saveMediaEdit(
  sourceAssetId: string,
  operations: EditOperation[],
  renderedFile?: Blob
): Promise<SaveEditResult> {
  if (renderedFile) {
    const form = new FormData();
    form.append("operations", JSON.stringify(operations));
    form.append("file", renderedFile, "edited.png");
    const response = await fetch(
      `/api/ai/media/assets/${sourceAssetId}/edits`,
      { method: "POST", body: form }
    );
    const payload = (await response.json()) as SaveEditResult & {
      error?: string;
    };
    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to save edit.");
    }
    return payload;
  }

  const response = await fetch(
    `/api/ai/media/assets/${sourceAssetId}/edits`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operations }),
    }
  );
  const payload = (await response.json()) as SaveEditResult & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to save edit.");
  }
  return payload;
}
