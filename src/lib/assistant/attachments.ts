import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeStoragePathSegment } from "@/lib/publishing/media";
import {
  ASSISTANT_MAX_ATTACHMENTS,
  ASSISTANT_MAX_IMAGE_BYTES,
  ASSISTANT_MAX_TEXT_BYTES,
} from "./attachment-constants";
import type { MessageAttachment } from "./types";

export {
  ASSISTANT_MAX_ATTACHMENTS,
  ASSISTANT_MAX_IMAGE_BYTES,
  ASSISTANT_MAX_TEXT_BYTES,
} from "./attachment-constants";

const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const TEXT_MIMES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

const TEXT_EXTENSIONS = [".txt", ".md", ".csv", ".json"];

export class AssistantAttachmentError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = "AssistantAttachmentError";
  }
}

function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "text/markdown":
      return "md";
    case "text/csv":
      return "csv";
    case "application/json":
      return "json";
    default:
      return "jpg";
  }
}

function detectMime(buffer: Buffer, fileName: string, declared: string): string {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return "image/jpeg";
  }
  if (buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) {
    return "image/png";
  }
  if (
    buffer.subarray(0, 4).equals(Buffer.from([0x52, 0x49, 0x46, 0x46])) &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  if (buffer.subarray(0, 6).toString("ascii") === "GIF89a" || buffer.subarray(0, 6).toString("ascii") === "GIF87a") {
    return "image/gif";
  }

  const lower = fileName.toLowerCase();
  if (TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    if (lower.endsWith(".json")) return "application/json";
    if (lower.endsWith(".csv")) return "text/csv";
    if (lower.endsWith(".md")) return "text/markdown";
    return "text/plain";
  }

  if (IMAGE_MIMES.has(declared)) return declared;
  if (TEXT_MIMES.has(declared)) return declared;
  return declared;
}

export async function validateAssistantFile(file: File): Promise<{
  type: "image" | "file";
  mime: string;
  buffer: Buffer;
}> {
  if (!file || file.size === 0) {
    throw new AssistantAttachmentError("File is empty.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = detectMime(buffer, file.name, file.type);

  if (IMAGE_MIMES.has(mime)) {
    if (buffer.length > ASSISTANT_MAX_IMAGE_BYTES) {
      throw new AssistantAttachmentError("Images must be 8 MB or smaller.");
    }
    return { type: "image", mime, buffer };
  }

  if (TEXT_MIMES.has(mime) || TEXT_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))) {
    if (buffer.length > ASSISTANT_MAX_TEXT_BYTES) {
      throw new AssistantAttachmentError("Text files must be 512 KB or smaller.");
    }
    return { type: "file", mime: TEXT_MIMES.has(mime) ? mime : "text/plain", buffer };
  }

  throw new AssistantAttachmentError(
    "Unsupported file type. Use images (JPEG, PNG, WebP, GIF) or text files (TXT, MD, CSV, JSON)."
  );
}

export function buildAssistantAttachmentUrl(path: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/assistant-attachments/${path.replace(/^\//, "")}`;
}

export async function uploadAssistantAttachment(
  supabase: SupabaseClient,
  organizationId: string,
  file: File
): Promise<MessageAttachment> {
  const { type, mime, buffer } = await validateAssistantFile(file);
  const orgSegment = sanitizeStoragePathSegment(organizationId);
  const objectPath = `${orgSegment}/${randomUUID()}.${extensionForMime(mime)}`;

  const { error } = await supabase.storage
    .from("assistant-attachments")
    .upload(objectPath, buffer, {
      contentType: mime,
      upsert: false,
    });

  if (error) {
    throw new AssistantAttachmentError("Unable to upload file.");
  }

  const url = buildAssistantAttachmentUrl(objectPath);
  if (!url) {
    throw new AssistantAttachmentError("Storage is not configured.");
  }

  let extractedText: string | null = null;
  if (type === "file") {
    extractedText = buffer.toString("utf-8").slice(0, 50_000);
  }

  return {
    id: randomUUID(),
    name: file.name,
    mimeType: mime,
    size: buffer.length,
    type,
    url,
    path: objectPath,
    extractedText,
  };
}

export type OpenAIContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };

export function buildUserMessageContent(
  text: string,
  attachments: MessageAttachment[]
): string | OpenAIContentPart[] {
  const parts: OpenAIContentPart[] = [];

  const trimmed = text.trim();
  if (trimmed) {
    parts.push({ type: "text", text: trimmed });
  }

  for (const attachment of attachments) {
    if (attachment.type === "image") {
      parts.push({
        type: "image_url",
        image_url: { url: attachment.url, detail: "auto" },
      });
    }
  }

  const fileBlocks = attachments
    .filter((a) => a.type === "file" && a.extractedText)
    .map(
      (a) =>
        `--- Attached file: ${a.name} ---\n${a.extractedText?.slice(0, 50_000) ?? ""}`
    );

  if (fileBlocks.length > 0) {
    parts.push({
      type: "text",
      text: fileBlocks.join("\n\n"),
    });
  }

  if (parts.length === 0) return "";
  if (parts.length === 1 && parts[0].type === "text") {
    return parts[0].text;
  }
  return parts;
}

export function parseMessageAttachments(value: unknown): MessageAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is MessageAttachment =>
      item &&
      typeof item === "object" &&
      typeof (item as MessageAttachment).url === "string" &&
      typeof (item as MessageAttachment).name === "string"
  );
}
