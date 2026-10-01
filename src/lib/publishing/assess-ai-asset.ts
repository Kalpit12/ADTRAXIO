import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthorizedMediaAsset } from "@/lib/ai/media/assets/access";
import { GENERATED_MEDIA_BUCKET } from "@/lib/ai/media/storage";
import { parseEditSpec } from "@/lib/media-editor/validation";
import { assessEditSpecPublishingLimitation } from "@/lib/content/creative-campaign";
import { PublishingError } from "./errors";
import type { PublishingMediaType } from "./types";

export interface AssessedPublishMedia {
  mediaType: PublishingMediaType;
  assetId: string;
  sourceAssetId: string;
}

export function assertGeneratedMediaStoragePath(
  organizationId: string,
  storageBucket: string,
  storagePath: string
): void {
  if (storageBucket !== GENERATED_MEDIA_BUCKET) {
    throw new PublishingError(
      "invalid_media",
      "Only generated media assets can be staged for publishing.",
      400
    );
  }
  const prefix = `generated/${organizationId}/`;
  if (!storagePath.startsWith(prefix)) {
    throw new PublishingError(
      "invalid_media",
      "Media path is not valid for this organization.",
      400
    );
  }
}

export async function assessAiMediaAssetForPublishing(
  userSupabase: SupabaseClient,
  input: {
    assetId: string;
    organizationId: string;
    clientWorkspaceId: string | null;
  }
): Promise<AssessedPublishMedia> {
  const asset = await getAuthorizedMediaAsset(
    userSupabase,
    input.assetId,
    input.organizationId,
    input.clientWorkspaceId
  );

  if (!asset) {
    throw new PublishingError("asset_not_found", "Media asset not found.", 404);
  }

  assertGeneratedMediaStoragePath(
    input.organizationId,
    asset.storage_bucket,
    asset.storage_path
  );

  if (asset.media_type === "audio") {
    throw new PublishingError(
      "unsupported_content",
      "Voice and sound assets are creative metadata only and cannot be published on their own.",
      400
    );
  }

  const editLimitation = assessEditSpecPublishingLimitation(
    asset.media_type,
    asset.edit_spec
  );
  if (editLimitation) {
    throw new PublishingError("unsupported_content", editLimitation, 400);
  }

  const mediaType = asset.media_type as PublishingMediaType;
  if (mediaType === "video") {
    throw new PublishingError(
      "unsupported_content",
      "Publishing this media type is not available yet.",
      400
    );
  }

  const spec = asset.edit_spec ? parseEditSpec(asset.edit_spec) : null;
  const sourceAssetId =
    spec?.sourceAssetId ?? asset.source_asset_id ?? asset.id;

  return {
    mediaType: "image",
    assetId: asset.id,
    sourceAssetId,
  };
}
