import { isOpenAIConfigured } from "@/lib/ai/generate-content";
import { buildLearningSystemPrompt, buildLearningUserPrompt } from "./prompts";
import { validateLearningInterpretation } from "./validation";
import type { LearningInterpretationJson } from "./types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export class LearningAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LearningAIError";
  }
}

export async function interpretOutcomeWithAI(input: {
  objective: string;
  recommendation?: string;
  brandBrain: string;
  baseline: unknown;
  outcome: unknown;
  comparison: unknown;
}): Promise<LearningInterpretationJson> {
  if (!isOpenAIConfigured()) {
    throw new LearningAIError("OpenAI is not configured.");
  }
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new LearningAIError("OpenAI is not configured.");

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildLearningSystemPrompt() },
        { role: "user", content: buildLearningUserPrompt(input) },
      ],
    }),
  });

  if (!response.ok) {
    throw new LearningAIError(`OpenAI error: ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new LearningAIError("Empty AI response.");

  return validateLearningInterpretation(JSON.parse(content));
}
