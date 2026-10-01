import type { SupabaseClient } from "@supabase/supabase-js";
import { MediaGenerationError, safeUserMessage } from "../errors";
import { insertMediaAsset, type MediaAssetRow } from "../repository";
import {
  buildGeneratedMediaStoragePath,
  extensionForMime,
  GENERATED_MEDIA_BUCKET,
} from "../storage";
import type { MediaEditSpec } from "@/lib/media-editor/types";
import { buildEditSpec, parseEditSpec } from "@/lib/media-editor/validation";
import type { EditOperation, EditorMediaType } from "@/lib/media-editor/types";

export interface SaveMediaEditInput {
  sourceAsset: MediaAssetRow;
  operations: EditOperation[];
  renderedBuffer?: Buffer;
  renderedMimeType?: string;
  renderedWidth?: number;
  renderedHeight?: number;
  userId: string;
}

export async function saveMediaEdit(
  admin: SupabaseClient,
  input: SaveMediaEditInput
): Promise<MediaAssetRow> {
  const mediaType = input.sourceAsset.media_type as EditorMediaType;
  const editSpec = buildEditSpec(
    input.sourceAsset.id,
    mediaType,
    input.operations
  );

  if (mediaType === "image" && input.renderedBuffer && input.renderedMimeType) {
    const mimeType = input.renderedMimeType;
    const storagePath = buildGeneratedMediaStoragePath({
      organizationId: input.sourceAsset.organization_id,
      clientWorkspaceId: input.sourceAsset.client_workspace_id,
      mediaType: "image",
      extension: extensionForMime(mimeType),
    });

    const { error: uploadError } = await admin.storage
      .from(GENERATED_MEDIA_BUCKET)
      .upload(storagePath, input.renderedBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new MediaGenerationError(
        "storage_error",
        safeUserMessage("storage_error"),
        { logDetail: uploadError.message }
      );
    }

    return insertMediaAsset(admin, {
      organizationId: input.sourceAsset.organization_id,
      clientWorkspaceId: input.sourceAsset.client_workspace_id,
      createdBy: input.userId,
      mediaType: "image",
      storageBucket: GENERATED_MEDIA_BUCKET,
      storagePath,
      mimeType,
      width: input.renderedWidth,
      height: input.renderedHeight,
      fileSizeBytes: input.renderedBuffer.length,
      provider: input.sourceAsset.provider,
      generationJobId: null,
      sourceAssetId: input.sourceAsset.id,
      editSpec: editSpec as unknown as Record<string, unknown>,
    });
  }

  return insertMediaAsset(admin, {
    organizationId: input.sourceAsset.organization_id,
    clientWorkspaceId: input.sourceAsset.client_workspace_id,
    createdBy: input.userId,
    mediaType: input.sourceAsset.media_type,
    storageBucket: input.sourceAsset.storage_bucket,
    storagePath: input.sourceAsset.storage_path,
    mimeType: input.sourceAsset.mime_type ?? "application/octet-stream",
    width: input.sourceAsset.width ?? undefined,
    height: input.sourceAsset.height ?? undefined,
    durationSeconds: input.sourceAsset.duration_seconds
      ? Number(input.sourceAsset.duration_seconds)
      : undefined,
    fileSizeBytes: input.sourceAsset.file_size_bytes
      ? Number(input.sourceAsset.file_size_bytes)
      : 0,
    provider: input.sourceAsset.provider,
    generationJobId: null,
    sourceAssetId: input.sourceAsset.id,
    editSpec: editSpec as unknown as Record<string, unknown>,
  });
}

export function resolveRootSourceAssetId(asset: MediaAssetRow): string {
  return asset.source_asset_id ?? asset.id;
}

export function parseStoredEditSpec(
  raw: Record<string, unknown> | null
): MediaEditSpec | null {
  if (!raw) return null;
  return parseEditSpec(raw);
}
