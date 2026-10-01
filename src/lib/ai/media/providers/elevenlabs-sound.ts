import { getElevenLabsApiKey, isElevenLabsConfigured } from "../config";
import { MediaGenerationError, normalizeProviderError, safeUserMessage } from "../errors";
import type { ProviderBinaryResult, SoundGenerationRequest } from "../types";
import type { SoundProvider } from "./interfaces";

const REQUEST_TIMEOUT_MS = 60_000;

export type FetchLike = typeof fetch;

export function createElevenLabsSoundProvider(fetchImpl: FetchLike = fetch): SoundProvider {
  return {
    id: "elevenlabs",
    async generateSoundEffect(input: SoundGenerationRequest): Promise<ProviderBinaryResult> {
      if (!isElevenLabsConfigured()) {
        throw new MediaGenerationError(
          "configuration_error",
          safeUserMessage("configuration_error")
        );
      }

      const apiKey = getElevenLabsApiKey();
      if (!apiKey) {
        throw new MediaGenerationError(
          "configuration_error",
          safeUserMessage("configuration_error")
        );
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetchImpl("https://api.elevenlabs.io/v1/sound-generation", {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text: input.text,
            duration_seconds: input.durationSeconds ?? 3,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const bodyText = await response.text().catch(() => "");
          throw normalizeProviderError("elevenlabs", new Error("ElevenLabs sound failed"), {
            httpStatus: response.status,
            bodySnippet: bodyText.slice(0, 500),
          });
        }

        const data = Buffer.from(await response.arrayBuffer());

        return {
          data,
          mimeType: "audio/mpeg",
          model: "sound_generation",
          units: {
            durationSeconds: input.durationSeconds ?? 3,
          },
        };
      } catch (error) {
        if (error instanceof MediaGenerationError) {
          throw error;
        }
        throw normalizeProviderError("elevenlabs", error);
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
