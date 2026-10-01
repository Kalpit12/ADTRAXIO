import { NextResponse } from "next/server";
import {
  createSignedMediaAssetUrl,
  getAuthorizedMediaAsset,
} from "@/lib/ai/media/assets/access";
import { resolveRootSourceAssetId } from "@/lib/ai/media/assets/edits-service";
import { jsonMediaError } from "@/lib/ai/media/api";
import { toPublicAsset } from "@/lib/ai/media/repository";
import { requireAuthContext } from "@/lib/social/auth-context";

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> }
) {
  const auth = await requireAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { assetId } = await context.params;

  try {
    const asset = await getAuthorizedMediaAsset(
      auth.supabase,
      assetId,
      auth.organizationId,
      auth.workspace.clientWorkspaceId
    );

    if (!asset) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

    const url = await createSignedMediaAssetUrl(
      auth.supabase,
      asset.storage_bucket,
      asset.storage_path
    );

    return NextResponse.json({
      asset: toPublicAsset(asset),
      url,
      rootSourceAssetId: resolveRootSourceAssetId(asset),
    });
  } catch (error) {
    return jsonMediaError(error);
  }
}
