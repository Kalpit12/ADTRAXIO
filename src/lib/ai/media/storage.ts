import { randomUUID } from "crypto";
import type { MediaType } from "./types";

export const GENERATED_MEDIA_BUCKET = "generated-media";

export function buildGeneratedMediaStoragePath(params: {
  organizationId: string;
  clientWorkspaceId: string | null;
  mediaType: MediaType;
  assetId?: string;
  extension: string;
}): string {
  const assetId = params.assetId ?? randomUUID();
  const workspaceSegment = params.clientWorkspaceId ?? "_org";
  const ext = params.extension.replace(/^\./, "");
  return [
    "generated",
    params.organizationId,
    workspaceSegment,
    params.mediaType,
    `${assetId}.${ext}`,
  ].join("/");
}

export function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "video/mp4":
      return "mp4";
    case "audio/mpeg":
    case "audio/mp3":
      return "mp3";
    case "audio/wav":
      return "wav";
    case "audio/ogg":
      return "ogg";
    default:
      return "bin";
  }
}
