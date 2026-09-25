import { isOpenAIConfigured } from "@/lib/ai/generate-content";
import {
  buildEvaluationSystemPrompt,
  buildEvaluationUserPrompt,
  buildExperimentEvaluationSystemPrompt,
  buildExperimentEvaluationUserPrompt,
} from "./prompts";
import {
  validateEvaluationInterpretation,
  validateExperimentEvaluationInterpretation,
} from "./validation";
import type { ExperimentEvaluationInterpretation, NormalizedExperimentEvaluation } from "./experiment";
import type { EvaluationInterpretationJson } from "./types";

export class EvaluationAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvaluationAIError";
  }
}

export async function interpretEvaluationWithAI(
  input: Parameters<typeof buildEvaluationUserPrompt>[0]
): Promise<EvaluationInterpretationJson> {
  if (!isOpenAIConfigured()) {
    throw new EvaluationAIError("OpenAI is not configured.");
  }
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new EvaluationAIError("OpenAI is not configured.");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
        { role: "system", content: buildEvaluationSystemPrompt() },
        { role: "user", content: buildEvaluationUserPrompt(input) },
      ],
    }),
  });

  if (!response.ok) {
    throw new EvaluationAIError(`OpenAI error: ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new EvaluationAIError("Empty AI response.");

  return validateEvaluationInterpretation(JSON.parse(content));
}

export async function interpretExperimentEvaluationWithAI(
  normalized: NormalizedExperimentEvaluation
): Promise<ExperimentEvaluationInterpretation> {
  if (!isOpenAIConfigured()) {
    throw new EvaluationAIError("OpenAI is not configured.");
  }
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new EvaluationAIError("OpenAI is not configured.");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
        { role: "system", content: buildExperimentEvaluationSystemPrompt() },
        { role: "user", content: buildExperimentEvaluationUserPrompt(normalized) },
      ],
    }),
  });

  if (!response.ok) {
    throw new EvaluationAIError(`OpenAI error: ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new EvaluationAIError("Empty AI response.");

  return validateExperimentEvaluationInterpretation(JSON.parse(content));
}
