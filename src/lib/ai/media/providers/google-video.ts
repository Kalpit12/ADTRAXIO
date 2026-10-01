import { getGoogleGenerativeApiKey, getGoogleVideoModel, isGoogleVideoConfigured } from "../config";
import { MediaGenerationError, normalizeProviderError, safeUserMessage } from "../errors";
import type { ProviderBinaryResult, ProviderVideoResult, VideoGenerationRequest } from "../types";
import type { VideoProvider } from "./interfaces";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const REQUEST_TIMEOUT_MS = 60_000;

export type FetchLike = typeof fetch;

function buildVideoStartUrl(model: string): string {
  return `${BASE_URL}/models/${model}:predictLongRunning`;
}

function buildOperationUrl(operationName: string): string {
  const path = operationName.startsWith("operations/")
    ? operationName
    : `operations/${operationName}`;
  return `${BASE_URL}/${path}`;
}

export function createGoogleVideoProvider(fetchImpl: FetchLike = fetch): VideoProvider {
  return {
    id: "google",
    async startVideoGeneration(
      input: VideoGenerationRequest
    ): Promise<ProviderVideoResult> {
      if (!isGoogleVideoConfigured()) {
        throw new MediaGenerationError(
          "configuration_error",
          safeUserMessage("configuration_error")
        );
      }

      const apiKey = getGoogleGenerativeApiKey();
      if (!apiKey) {
        throw new MediaGenerationError(
          "configuration_error",
          safeUserMessage("configuration_error")
        );
      }

      const model = getGoogleVideoModel();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetchImpl(
          `${buildVideoStartUrl(model)}?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              instances: [{ prompt: input.prompt }],
              parameters: {
                aspectRatio: input.aspectRatio ?? "16:9",
                durationSeconds: input.durationSeconds ?? 8,
              },
            }),
            signal: controller.signal,
          }
        );

        const bodyText = await response.text().catch(() => "");

        if (!response.ok) {
          throw normalizeProviderError("google", new Error("Google video start failed"), {
            httpStatus: response.status,
            bodySnippet: bodyText.slice(0, 500),
          });
        }

        let payload: { name?: string; done?: boolean; response?: { generatedVideos?: { video?: { uri?: string } }[] } };
        try {
          payload = JSON.parse(bodyText) as typeof payload;
        } catch {
          throw new MediaGenerationError("provider_error", safeUserMessage("provider_error"), {
            logDetail: "Google video: invalid JSON",
          });
        }

        if (payload.name && !payload.done) {
          return {
            kind: "async",
            providerJobId: payload.name,
            model,
          };
        }

        const uri = payload.response?.generatedVideos?.[0]?.video?.uri;
        if (uri) {
          const videoResponse = await fetchImpl(uri, { signal: controller.signal });
          if (!videoResponse.ok) {
            throw normalizeProviderError("google", new Error("video download failed"), {
              httpStatus: videoResponse.status,
            });
          }
          const data = Buffer.from(await videoResponse.arrayBuffer());
          return {
            data,
            mimeType: "video/mp4",
            durationSeconds: input.durationSeconds,
            model,
            units: { durationSeconds: input.durationSeconds ?? 8 },
          };
        }

        if (payload.name) {
          return { kind: "async", providerJobId: payload.name, model };
        }

        throw new MediaGenerationError("provider_error", safeUserMessage("provider_error"), {
          logDetail: "Google video: unexpected response shape",
        });
      } catch (error) {
        if (error instanceof MediaGenerationError) {
          throw error;
        }
        throw normalizeProviderError("google", error);
      } finally {
        clearTimeout(timeout);
      }
    },

    async pollVideoGeneration(providerJobId: string): Promise<ProviderVideoResult> {
      const apiKey = getGoogleGenerativeApiKey();
      if (!apiKey) {
        throw new MediaGenerationError(
          "configuration_error",
          safeUserMessage("configuration_error")
        );
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetchImpl(
          `${buildOperationUrl(providerJobId)}?key=${encodeURIComponent(apiKey)}`,
          { signal: controller.signal }
        );
        const bodyText = await response.text().catch(() => "");

        if (!response.ok) {
          throw normalizeProviderError("google", new Error("Google video poll failed"), {
            httpStatus: response.status,
            bodySnippet: bodyText.slice(0, 500),
          });
        }

        const payload = JSON.parse(bodyText) as {
          done?: boolean;
          name?: string;
          response?: { generatedVideos?: { video?: { uri?: string } }[] };
          error?: { message?: string };
        };

        if (!payload.done) {
          return { kind: "async", providerJobId: payload.name ?? providerJobId };
        }

        if (payload.error) {
          throw normalizeProviderError("google", new Error(payload.error.message ?? "failed"), {
            bodySnippet: JSON.stringify(payload.error),
          });
        }

        const uri = payload.response?.generatedVideos?.[0]?.video?.uri;
        if (!uri) {
          throw new MediaGenerationError("provider_error", safeUserMessage("provider_error"), {
            logDetail: "Google video poll: missing uri",
          });
        }

        const videoResponse = await fetchImpl(uri, { signal: controller.signal });
        if (!videoResponse.ok) {
          throw normalizeProviderError("google", new Error("video download failed"), {
            httpStatus: videoResponse.status,
          });
        }

        const data = Buffer.from(await videoResponse.arrayBuffer());
        const result: ProviderBinaryResult = {
          data,
          mimeType: "video/mp4",
          model: getGoogleVideoModel(),
          units: {},
        };
        return result;
      } catch (error) {
        if (error instanceof MediaGenerationError) {
          throw error;
        }
        throw normalizeProviderError("google", error);
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
