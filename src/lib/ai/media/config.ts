import type { MediaProvider, MediaType } from "./types";

export function getOpenAIApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || null;
}

export function isOpenAIImageConfigured(): boolean {
  return Boolean(getOpenAIApiKey());
}

export function getGoogleGenerativeApiKey(): string | null {
  const key =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim();
  return key || null;
}

export function isGoogleVideoConfigured(): boolean {
  return Boolean(getGoogleGenerativeApiKey());
}

export function getElevenLabsApiKey(): string | null {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  return key || null;
}

export function isElevenLabsConfigured(): boolean {
  return Boolean(getElevenLabsApiKey());
}

export function getOpenAIImageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
}

export function getGoogleVideoModel(): string {
  return process.env.GOOGLE_VIDEO_MODEL?.trim() || "veo-2.0-generate-001";
}

export function assertProviderConfigured(
  provider: MediaProvider,
  mediaType: MediaType
): void {
  if (provider === "openai" && mediaType === "image") {
    if (!isOpenAIImageConfigured()) {
      throw new Error("OpenAI image generation is not configured.");
    }
    return;
  }
  if (provider === "google" && mediaType === "video") {
    if (!isGoogleVideoConfigured()) {
      throw new Error("Google video generation is not configured.");
    }
    return;
  }
  if (provider === "elevenlabs" && mediaType === "audio") {
    if (!isElevenLabsConfigured()) {
      throw new Error("ElevenLabs audio generation is not configured.");
    }
  }
}

export const DEFAULT_PROVIDER_BY_MEDIA: Record<MediaType, MediaProvider> = {
  image: "openai",
  video: "google",
  audio: "elevenlabs",
};
