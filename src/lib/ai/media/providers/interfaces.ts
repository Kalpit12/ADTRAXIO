import type {
  ImageGenerationRequest,
  ProviderBinaryResult,
  ProviderVideoResult,
  SoundGenerationRequest,
  SpeechGenerationRequest,
  VideoGenerationRequest,
} from "../types";

export interface ImageProvider {
  readonly id: "openai";
  generateImage(input: ImageGenerationRequest): Promise<ProviderBinaryResult>;
}

export interface VideoProvider {
  readonly id: "google";
  startVideoGeneration(input: VideoGenerationRequest): Promise<ProviderVideoResult>;
  pollVideoGeneration?(providerJobId: string): Promise<ProviderVideoResult>;
}

export interface SpeechProvider {
  readonly id: "elevenlabs";
  generateSpeech(input: SpeechGenerationRequest): Promise<ProviderBinaryResult>;
}

export interface SoundProvider {
  readonly id: "elevenlabs";
  generateSoundEffect(input: SoundGenerationRequest): Promise<ProviderBinaryResult>;
}

export interface MediaProviderRegistry {
  image: ImageProvider;
  video: VideoProvider;
  speech: SpeechProvider;
  sound: SoundProvider;
}
