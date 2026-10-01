import { buildCreativeConceptPrompt } from "@/lib/ai/creative-concept-prompt";
import { parseCreativeConcept } from "@/lib/content/creative-studio";
import type { CreativeConcept } from "@/lib/content/creative-studio-types";
import type { CreativeBrief } from "@/lib/content/types";
import {
  AIConfigurationError,
  AIGenerationError,
} from "@/lib/ai/generate-content";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 45_000;

export async function generateCreativeConcept(
  brief: CreativeBrief
): Promise<CreativeConcept> {
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
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Respond with JSON only.",
          },
          {
            role: "user",
            content: buildCreativeConceptPrompt(brief),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new AIGenerationError(`Concept request failed (${response.status}).`);
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new AIGenerationError("Concept response was empty.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new AIGenerationError("Concept response was malformed.");
    }

    const concept = parseCreativeConcept(parsed);
    if (!concept) {
      throw new AIGenerationError("Concept response was missing required fields.");
    }

    return concept;
  } catch (error) {
    if (
      error instanceof AIConfigurationError ||
      error instanceof AIGenerationError
    ) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new AIGenerationError("Concept request timed out.");
    }
    throw new AIGenerationError("Unable to generate concept.");
  } finally {
    clearTimeout(timeout);
  }
}
