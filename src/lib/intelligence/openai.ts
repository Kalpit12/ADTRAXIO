import { isOpenAIConfigured } from "@/lib/ai/generate-content";
import { buildIntelligencePrompt } from "./prompts";
import type { IntelligenceAnalysisContext } from "./types";
import { IntelligenceValidationError, validateAIGenerationOutput } from "./validation";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 60_000;

export class IntelligenceAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntelligenceAIError";
  }
}

export { isOpenAIConfigured };

export async function generateIntelligenceWithAI(
  context: IntelligenceAnalysisContext
) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new IntelligenceAIError(
      "Growth Intelligence is temporarily unavailable. Your analytics are still available."
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You analyze social performance data and return structured JSON insights. Never invent data.",
          },
          {
            role: "user",
            content: buildIntelligencePrompt(context),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new IntelligenceAIError(
        "Growth Intelligence is temporarily unavailable. Your analytics are still available."
      );
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new IntelligenceAIError("AI returned an empty response.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new IntelligenceValidationError("AI returned malformed JSON.");
    }

    return validateAIGenerationOutput(parsed);
  } catch (error) {
    if (
      error instanceof IntelligenceAIError ||
      error instanceof IntelligenceValidationError
    ) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new IntelligenceAIError("Analysis timed out. Try again.");
    }
    throw new IntelligenceAIError(
      "Growth Intelligence is temporarily unavailable. Your analytics are still available."
    );
  } finally {
    clearTimeout(timeout);
  }
}
