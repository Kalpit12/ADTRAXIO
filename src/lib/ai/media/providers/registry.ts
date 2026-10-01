import type { MediaProviderRegistry } from "./interfaces";
import { createElevenLabsSoundProvider } from "./elevenlabs-sound";
import { createElevenLabsSpeechProvider } from "./elevenlabs-speech";
import { createGoogleVideoProvider } from "./google-video";
import { createOpenAIImageProvider } from "./openai-image";

let defaultRegistry: MediaProviderRegistry | null = null;

export function getMediaProviderRegistry(): MediaProviderRegistry {
  if (!defaultRegistry) {
    defaultRegistry = {
      image: createOpenAIImageProvider(),
      video: createGoogleVideoProvider(),
      speech: createElevenLabsSpeechProvider(),
      sound: createElevenLabsSoundProvider(),
    };
  }
  return defaultRegistry;
}

export function setMediaProviderRegistry(registry: MediaProviderRegistry): void {
  defaultRegistry = registry;
}

export function resetMediaProviderRegistry(): void {
  defaultRegistry = null;
}
