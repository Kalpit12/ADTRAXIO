import {
  getOpenAIApiKey,
  getOpenAIImageModel,
  isOpenAIImageConfigured,
} from "../config";
import { MediaGenerationError, normalizeProviderError, safeUserMessage } from "../errors";
import type { ImageGenerationRequest, ProviderBinaryResult } from "../types";
import type { ImageProvider } from "./interfaces";

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const REQUEST_TIMEOUT_MS = 120_000;

export type FetchLike = typeof fetch;

export function createOpenAIImageProvider(fetchImpl: FetchLike = fetch): ImageProvider {
  return {
    id: "openai",
    async generateImage(input: ImageGenerationRequest): Promise<ProviderBinaryResult> {
      if (!isOpenAIImageConfigured()) {
        throw new MediaGenerationError(
          "configuration_error",
          safeUserMessage("configuration_error")
        );
      }

      const apiKey = getOpenAIApiKey();
      if (!apiKey) {
        throw new MediaGenerationError(
          "configuration_error",
          safeUserMessage("configuration_error")
        );
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetchImpl(OPENAI_IMAGES_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: getOpenAIImageModel(),
            prompt: input.prompt,
            size: input.size ?? "1024x1024",
            n: 1,
          }),
          signal: controller.signal,
        });

        const bodyText = await response.text().catch(() => "");

        if (!response.ok) {
          throw normalizeProviderError("openai", new Error("OpenAI image failed"), {
            httpStatus: response.status,
            bodySnippet: bodyText.slice(0, 500),
          });
        }

        let payload: {
          data?: { b64_json?: string; url?: string }[];
        };
        try {
          payload = JSON.parse(bodyText) as typeof payload;
        } catch {
          throw new MediaGenerationError("provider_error", safeUserMessage("provider_error"), {
            logDetail: "OpenAI image: invalid JSON",
          });
        }

        const item = payload.data?.[0];
        if (!item) {
          throw new MediaGenerationError("provider_error", safeUserMessage("provider_error"), {
            logDetail: "OpenAI image: empty data",
          });
        }

        let buffer: Buffer;
        if (item.b64_json) {
          buffer = Buffer.from(item.b64_json, "base64");
        } else if (item.url) {
          const imageResponse = await fetchImpl(item.url, { signal: controller.signal });
          if (!imageResponse.ok) {
            throw normalizeProviderError("openai", new Error("image download failed"), {
              httpStatus: imageResponse.status,
            });
          }
          buffer = Buffer.from(await imageResponse.arrayBuffer());
        } else {
          throw new MediaGenerationError("provider_error", safeUserMessage("provider_error"), {
            logDetail: "OpenAI image: missing b64_json/url",
          });
        }

        const size = input.size ?? "1024x1024";
        const [w, h] = size.split("x").map((n) => parseInt(n, 10));

        return {
          data: buffer,
          mimeType: "image/png",
          width: Number.isFinite(w) ? w : undefined,
          height: Number.isFinite(h) ? h : undefined,
          model: getOpenAIImageModel(),
          units: { images: 1 },
        };
      } catch (error) {
        if (error instanceof MediaGenerationError) {
          throw error;
        }
        throw normalizeProviderError("openai", error);
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
