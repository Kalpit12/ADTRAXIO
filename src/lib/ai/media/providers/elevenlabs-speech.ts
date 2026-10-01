import { getElevenLabsApiKey, isElevenLabsConfigured } from "../config";
import { MediaGenerationError, normalizeProviderError, safeUserMessage } from "../errors";
import type { ProviderBinaryResult, SpeechGenerationRequest } from "../types";
import type { SpeechProvider } from "./interfaces";

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const REQUEST_TIMEOUT_MS = 60_000;

export type FetchLike = typeof fetch;

export function createElevenLabsSpeechProvider(fetchImpl: FetchLike = fetch): SpeechProvider {
  return {
    id: "elevenlabs",
    async generateSpeech(input: SpeechGenerationRequest): Promise<ProviderBinaryResult> {
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

      const voiceId = input.voiceId ?? DEFAULT_VOICE_ID;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetchImpl(
          `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
              Accept: "audio/mpeg",
            },
            body: JSON.stringify({
              text: input.text,
              model_id: "eleven_multilingual_v2",
            }),
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          const bodyText = await response.text().catch(() => "");
          throw normalizeProviderError("elevenlabs", new Error("ElevenLabs TTS failed"), {
            httpStatus: response.status,
            bodySnippet: bodyText.slice(0, 500),
          });
        }

        const data = Buffer.from(await response.arrayBuffer());
        const charCount = input.text.length;

        return {
          data,
          mimeType: "audio/mpeg",
          model: "eleven_multilingual_v2",
          units: { characters: charCount },
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
