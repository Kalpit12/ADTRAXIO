/**
 * Sole write path for copying AI-generated assets into public `content-media`.
 *
 * Production invariant: do not call until the caller has enforced:
 * - operational auth + workspace scope (publishing routes)
 * - content approval (when applicable)
 * - asset authorization + media-type rules (`assessAiMediaAssetForPublishing`)
 * - content ↔ asset linkage (`verifyPublishMediaAssetForContent`)
 *
 * Intended caller: `createScheduledPostRecord` in `service.ts` only.
 */
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthorizedMediaAsset } from "@/lib/ai/media/assets/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { assessAiMediaAssetForPublishing } from "./assess-ai-asset";
import { PublishingError } from "./errors";
import {
  buildPublicMediaUrl,
  sanitizeStoragePathSegment,
  validateBuffer,
} from "./media";
import type { PublishingMediaType } from "./types";
import { GENERATED_MEDIA_BUCKET } from "@/lib/ai/media/storage";

export interface StagedPublishMedia {
  mediaType: PublishingMediaType;
  mediaUrl: string;
  assetId: string;
  sourceAssetId: string;
}

export async function stageAiMediaAssetForPublishing(
  userSupabase: SupabaseClient,
  input: {
    assetId: string;
    organizationId: string;
    clientWorkspaceId: string | null;
  }
): Promise<StagedPublishMedia> {
  const assessed = await assessAiMediaAssetForPublishing(userSupabase, input);

  const row = await getAuthorizedMediaAsset(
    userSupabase,
    assessed.assetId,
    input.organizationId,
    input.clientWorkspaceId
  );

  if (!row) {
    throw new PublishingError("asset_not_found", "Media asset not found.", 404);
  }

  const admin = createAdminClient();
  if (!admin) {
    throw new PublishingError(
      "storage_error",
      "Media storage is not configured.",
      503
    );
  }

  const { data: fileData, error: downloadError } = await admin.storage
    .from(GENERATED_MEDIA_BUCKET)
    .download(row.storage_path);

  if (downloadError || !fileData) {
    throw new PublishingError(
      "invalid_media",
      "Unable to load media for publishing.",
      400
    );
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const fileName = row.storage_path.split("/").pop() ?? "asset.png";
  const { mime } = validateBuffer(
    buffer,
    fileName,
    row.mime_type ?? "image/png"
  );

  const extension =
    mime === "image/png"
      ? "png"
      : mime === "image/webp"
        ? "webp"
        : "jpg";

  const orgSegment = sanitizeStoragePathSegment(input.organizationId);
  const objectPath = `${orgSegment}/${randomUUID()}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from("content-media")
    .upload(objectPath, buffer, {
      contentType: mime,
      upsert: false,
    });

  if (uploadError) {
    throw new PublishingError(
      "upload_failed",
      "Unable to prepare media for publishing.",
      500
    );
  }

  const mediaUrl = buildPublicMediaUrl(objectPath);
  if (!mediaUrl) {
    throw new PublishingError(
      "storage_error",
      "Media hosting is not configured.",
      503
    );
  }

  return {
    mediaType: assessed.mediaType,
    mediaUrl,
    assetId: assessed.assetId,
    sourceAssetId: assessed.sourceAssetId,
  };
}
