import { PublishingError } from "./errors";
import type { PublishingMediaType } from "./types";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const ALLOWED_TYPES: Record<PublishingMediaType, { mimes: string[]; extensions: string[] }> = {
  image: {
    mimes: ["image/jpeg", "image/png", "image/webp"],
    extensions: [".jpg", ".jpeg", ".png", ".webp"],
  },
  video: {
    mimes: ["video/mp4", "video/quicktime"],
    extensions: [".mp4", ".mov"],
  },
};

function detectMediaType(buffer: Buffer, fileName: string): PublishingMediaType | null {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return "image";
  }
  if (buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) {
    return "image";
  }
  if (
    buffer.subarray(0, 4).equals(Buffer.from([0x52, 0x49, 0x46, 0x46])) &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image";
  }
  if (buffer.length >= 8 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    return "video";
  }

  const lower = fileName.toLowerCase();
  if (ALLOWED_TYPES.image.extensions.some((ext) => lower.endsWith(ext))) {
    return "image";
  }
  if (ALLOWED_TYPES.video.extensions.some((ext) => lower.endsWith(ext))) {
    return "video";
  }

  return null;
}

export async function validateUploadFile(file: File): Promise<{
  mediaType: PublishingMediaType;
  mime: string;
}> {
  if (!file || file.size === 0) {
    throw new PublishingError("invalid_media", "Media file is empty.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return validateBuffer(buffer, file.name, file.type);
}

function validateBuffer(
  buffer: Buffer,
  fileName: string,
  declaredMime: string
): { mediaType: PublishingMediaType; mime: string } {
  const mediaType = detectMediaType(buffer, fileName);
  if (!mediaType) {
    throw new PublishingError(
      "invalid_media",
      "Unsupported media format. Use JPEG, PNG, WebP, or MP4."
    );
  }

  const allowed = ALLOWED_TYPES[mediaType];
  const lowerName = fileName.toLowerCase();
  const hasAllowedExtension = allowed.extensions.some((ext) => lowerName.endsWith(ext));

  if (!hasAllowedExtension) {
    throw new PublishingError("invalid_media", "File extension does not match supported formats.");
  }

  const maxBytes = mediaType === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (buffer.length > maxBytes) {
    throw new PublishingError(
      "invalid_media",
      mediaType === "image"
        ? "Images must be 8 MB or smaller."
        : "Videos must be 50 MB or smaller."
    );
  }

  const mime =
    declaredMime && allowed.mimes.includes(declaredMime)
      ? declaredMime
      : allowed.mimes[0];

  if (!allowed.mimes.includes(mime)) {
    throw new PublishingError("invalid_media", "Unsupported MIME type for publishing media.");
  }

  return { mediaType, mime };
}

export function buildPublicMediaUrl(path: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/content-media/${path.replace(/^\//, "")}`;
}

export function sanitizeStoragePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]/g, "");
}
