import { buildGenerateContentPrompt } from "@/lib/ai/prompts";
import { validateGeneratedCreative } from "@/lib/content/validation";
import type { CreativeBrief, GeneratedCreative } from "@/lib/content/types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 45_000;

export class AIConfigurationError extends Error {
  constructor(message = "AI generation is not configured yet.") {
    super(message);
    this.name = "AIConfigurationError";
  }
}

export class AIGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIGenerationError";
  }
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function generateContentWithAI(
  brief: CreativeBrief,
  options?: { variationOf?: GeneratedCreative }
): Promise<GeneratedCreative> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new AIConfigurationError();
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
        temperature: options?.variationOf ? 0.9 : 0.7,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You write structured advertising copy. Respond with JSON only.",
          },
          {
            role: "user",
            content: buildGenerateContentPrompt(brief, options),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new AIGenerationError(
        errorText
          ? `AI request failed (${response.status}).`
          : `AI request failed (${response.status}).`
      );
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new AIGenerationError("AI returned an empty response.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new AIGenerationError("AI returned malformed JSON.");
    }

    const validated = validateGeneratedCreative(parsed);
    if (!validated) {
      throw new AIGenerationError("AI response was missing required fields.");
    }

    return validated;
  } catch (error) {
    if (error instanceof AIConfigurationError || error instanceof AIGenerationError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new AIGenerationError("AI request timed out. Try again.");
    }
    throw new AIGenerationError("Unable to generate content right now.");
  } finally {
    clearTimeout(timeout);
  }
}
