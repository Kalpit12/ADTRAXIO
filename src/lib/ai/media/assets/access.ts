import type { SupabaseClient } from "@supabase/supabase-js";
import { MediaGenerationError, safeUserMessage } from "../errors";
import { getMediaAsset } from "../repository";
import { GENERATED_MEDIA_BUCKET } from "../storage";

const SIGNED_URL_TTL_SECONDS = 3600;

export async function getAuthorizedMediaAsset(
  supabase: SupabaseClient,
  assetId: string,
  organizationId: string,
  clientWorkspaceId: string | null
) {
  const asset = await getMediaAsset(supabase, assetId);
  if (!asset) {
    return null;
  }
  if (asset.organization_id !== organizationId) {
    return null;
  }
  if (
    clientWorkspaceId &&
    asset.client_workspace_id &&
    asset.client_workspace_id !== clientWorkspaceId
  ) {
    return null;
  }
  return asset;
}

export async function createSignedMediaAssetUrl(
  supabase: SupabaseClient,
  storageBucket: string,
  storagePath: string
): Promise<string> {
  const bucket = storageBucket || GENERATED_MEDIA_BUCKET;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new MediaGenerationError("storage_error", safeUserMessage("storage_error"), {
      logDetail: error?.message,
    });
  }

  return data.signedUrl;
}
