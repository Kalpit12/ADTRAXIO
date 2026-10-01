import type {
  ImageGenerationRequest,
  SoundGenerationRequest,
  SpeechGenerationRequest,
  VideoGenerationRequest,
} from "./types";

const MAX_PROMPT_LENGTH = 8_000;

export const OPENAI_IMAGE_SIZES = ["1024x1024", "1024x1792", "1792x1024"] as const;

function parseImageSize(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  const size = value.trim();
  return (OPENAI_IMAGE_SIZES as readonly string[]).includes(size) ? size : undefined;
}
const MAX_SPEECH_LENGTH = 5_000;

function trimPrompt(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_PROMPT_LENGTH) {
    return null;
  }
  return trimmed;
}

function optionalIdempotencyKey(body: Record<string, unknown>): string | undefined {
  const key = body.idempotencyKey;
  if (key === undefined || key === null || key === "") {
    return undefined;
  }
  if (typeof key !== "string" || key.length > 128) {
    return undefined;
  }
  return key.trim();
}

export function parseImageGenerationBody(
  body: unknown
): { request: ImageGenerationRequest } | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body." };
  }
  const record = body as Record<string, unknown>;
  const prompt = trimPrompt(record.prompt);
  if (!prompt) {
    return { error: "Prompt is required." };
  }
  const size = parseImageSize(record.size);
  if (record.size !== undefined && record.size !== null && record.size !== "" && !size) {
    return { error: "Unsupported image size." };
  }
  const idempotencyKey = optionalIdempotencyKey(record);
  return { request: { prompt, size, idempotencyKey } };
}

export const VIDEO_ASPECT_RATIOS = ["16:9", "9:16", "1:1"] as const;
export const VIDEO_DURATION_SECONDS = [4, 6, 8] as const;

function parseVideoAspectRatio(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  const ratio = value.trim();
  return (VIDEO_ASPECT_RATIOS as readonly string[]).includes(ratio) ? ratio : undefined;
}

function parseVideoDuration(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const rounded = Math.round(value);
  return (VIDEO_DURATION_SECONDS as readonly number[]).includes(rounded)
    ? rounded
    : undefined;
}

export function parseVideoGenerationBody(
  body: unknown
): { request: VideoGenerationRequest } | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body." };
  }
  const record = body as Record<string, unknown>;
  const prompt = trimPrompt(record.prompt);
  if (!prompt) {
    return { error: "Prompt is required." };
  }

  if (
    record.referenceImage !== undefined ||
    record.referenceImageUrl !== undefined ||
    record.image !== undefined
  ) {
    return { error: "Reference images are not supported yet." };
  }

  const aspectRatio = parseVideoAspectRatio(record.aspectRatio);
  if (
    record.aspectRatio !== undefined &&
    record.aspectRatio !== null &&
    record.aspectRatio !== "" &&
    !aspectRatio
  ) {
    return { error: "Unsupported video aspect ratio." };
  }

  const durationSeconds = parseVideoDuration(record.durationSeconds);
  if (
    record.durationSeconds !== undefined &&
    record.durationSeconds !== null &&
    durationSeconds === undefined
  ) {
    return { error: "Unsupported video duration." };
  }

  const idempotencyKey = optionalIdempotencyKey(record);
  return {
    request: {
      prompt,
      durationSeconds,
      aspectRatio,
      idempotencyKey,
    },
  };
}

export const ELEVENLABS_VOICE_PRESETS = ["21m00Tcm4TlvDq8ikWAM"] as const;
export const SOUND_DURATION_SECONDS = [3, 5, 10] as const;

function parseVoiceId(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  const voiceId = value.trim();
  if (voiceId.length > 64) {
    return undefined;
  }
  if (!(ELEVENLABS_VOICE_PRESETS as readonly string[]).includes(voiceId)) {
    return undefined;
  }
  return voiceId;
}

function parseSoundDuration(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const rounded = Math.round(value);
  return (SOUND_DURATION_SECONDS as readonly number[]).includes(rounded)
    ? rounded
    : undefined;
}

export function parseSpeechGenerationBody(
  body: unknown
): { request: SpeechGenerationRequest } | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body." };
  }
  const record = body as Record<string, unknown>;
  const text = typeof record.text === "string" ? record.text.trim() : "";
  if (!text || text.length > MAX_SPEECH_LENGTH) {
    return { error: "Text is required." };
  }

  if (record.model !== undefined || record.model_id !== undefined) {
    return { error: "Unsupported speech configuration." };
  }

  const voiceId = parseVoiceId(record.voiceId);
  if (
    record.voiceId !== undefined &&
    record.voiceId !== null &&
    record.voiceId !== "" &&
    !voiceId
  ) {
    return { error: "Unsupported voice selection." };
  }

  const idempotencyKey = optionalIdempotencyKey(record);
  return { request: { text, voiceId, idempotencyKey } };
}

export function parseSoundGenerationBody(
  body: unknown
): { request: SoundGenerationRequest } | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body." };
  }
  const record = body as Record<string, unknown>;
  const text = typeof record.text === "string" ? record.text.trim() : "";
  if (!text || text.length > MAX_SPEECH_LENGTH) {
    return { error: "Description is required." };
  }

  const durationSeconds = parseSoundDuration(record.durationSeconds);
  if (
    record.durationSeconds !== undefined &&
    record.durationSeconds !== null &&
    durationSeconds === undefined
  ) {
    return { error: "Unsupported sound duration." };
  }

  const idempotencyKey = optionalIdempotencyKey(record);
  return { request: { text, durationSeconds, idempotencyKey } };
}
