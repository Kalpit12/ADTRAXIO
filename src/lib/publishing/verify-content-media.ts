import type { SupabaseClient } from "@supabase/supabase-js";
import { parseStudioVisualState } from "@/lib/content/visual-types";
import { PublishingError } from "./errors";

export async function verifyPublishMediaAssetForContent(
  supabase: SupabaseClient,
  contentId: string,
  organizationId: string,
  mediaAssetId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("content")
    .select("studio_visual")
    .eq("id", contentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) {
    throw new PublishingError("invalid_content", "Content not found.", 404);
  }

  const visual = parseStudioVisualState(data.studio_visual ?? {});
  const allowed = new Set<string>();
  for (const ref of visual.assets) {
    allowed.add(ref.assetId);
  }
  if (visual.creativePublishing?.selectedMediaAssetId) {
    allowed.add(visual.creativePublishing.selectedMediaAssetId);
  }

  if (!allowed.has(mediaAssetId)) {
    throw new PublishingError(
      "invalid_media",
      "Media asset is not linked to this content.",
      403
    );
  }
}
