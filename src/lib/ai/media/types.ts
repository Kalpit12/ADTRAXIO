export const MEDIA_TYPES = ["image", "video", "audio"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const GENERATION_STATUSES = [
  "queued",
  "processing",
  "completed",
  "failed",
  "cancelled",
] as const;
export type GenerationStatus = (typeof GENERATION_STATUSES)[number];

export const MEDIA_PROVIDERS = ["openai", "google", "elevenlabs"] as const;
export type MediaProvider = (typeof MEDIA_PROVIDERS)[number];

export interface MediaGenerationScope {
  organizationId: string;
  clientWorkspaceId: string | null;
  userId: string;
}

export interface ImageGenerationRequest {
  prompt: string;
  size?: string;
  idempotencyKey?: string;
}

export interface VideoGenerationRequest {
  prompt: string;
  durationSeconds?: number;
  aspectRatio?: string;
  idempotencyKey?: string;
}

export interface SpeechGenerationRequest {
  text: string;
  voiceId?: string;
  idempotencyKey?: string;
}

export interface SoundGenerationRequest {
  text: string;
  durationSeconds?: number;
  idempotencyKey?: string;
}

export interface PublicGenerationJob {
  id: string;
  organizationId: string;
  clientWorkspaceId: string | null;
  provider: MediaProvider;
  mediaType: MediaType;
  status: GenerationStatus;
  prompt: string;
  mediaAssetId: string | null;
  errorCategory: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface PublicMediaAsset {
  id: string;
  mediaType: MediaType;
  storageBucket: string;
  storagePath: string;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  fileSizeBytes: number | null;
  provider: MediaProvider;
  generationJobId: string | null;
  sourceAssetId: string | null;
  editSpec: Record<string, unknown> | null;
  createdAt: string;
}

export interface ProviderBinaryResult {
  data: Buffer;
  mimeType: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  model?: string;
  units?: Record<string, unknown>;
}

export interface ProviderAsyncHandle {
  kind: "async";
  providerJobId: string;
  model?: string;
}

export type ProviderVideoResult = ProviderBinaryResult | ProviderAsyncHandle;
