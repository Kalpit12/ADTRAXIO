import { isOpenAIConfigured } from "@/lib/ai/generate-content";
import type { StrategistContextBundle } from "./context";
import { buildStrategistSystemPrompt, buildStrategistUserPrompt } from "./prompts";
import type { StrategyType } from "./types";
import { validateStrategicPlanOutput } from "./validation";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 60_000;

export class StrategistAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StrategistAIError";
  }
}

export async function generateStrategicPlanWithAI(
  bundle: StrategistContextBundle,
  input: {
    objective: string;
    strategyType?: StrategyType;
    instructions?: string;
    includeAlternatives?: boolean;
  }
) {
  if (!isOpenAIConfigured()) {
    throw new StrategistAIError("OpenAI is not configured.");
  }
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new StrategistAIError("OpenAI is not configured.");
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
          { role: "system", content: buildStrategistSystemPrompt() },
          {
            role: "user",
            content: buildStrategistUserPrompt(bundle, input),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new StrategistAIError(`OpenAI error: ${response.status} ${text.slice(0, 200)}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new StrategistAIError("Empty AI response.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new StrategistAIError("AI response was not valid JSON.");
    }

    return validateStrategicPlanOutput(parsed);
  } catch (error) {
    if (error instanceof StrategistAIError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new StrategistAIError("OpenAI request timed out.");
    }
    throw new StrategistAIError(
      error instanceof Error ? error.message : "Strategic plan generation failed."
    );
  } finally {
    clearTimeout(timeout);
  }
}
