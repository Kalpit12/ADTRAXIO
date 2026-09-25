import { isOpenAIConfigured } from "@/lib/ai/generate-content";
import {
  buildExperimentDraftSystemPrompt,
  buildExperimentDraftUserPrompt,
  buildExperimentIntelligenceSystemPrompt,
  buildExperimentIntelligenceUserPrompt,
  buildExperimentInterpretSystemPrompt,
  buildExperimentInterpretUserPrompt,
} from "./prompts";
import {
  validateAiDraft,
  validateIntelligenceInterpretation,
  validateInterpretation,
} from "./validation";
import type {
  ExperimentAiDraftOutput,
  ExperimentIntelligenceInterpretation,
  ExperimentInterpretationJson,
} from "./types";

export class ExperimentAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExperimentAIError";
  }
}

async function chatJson(system: string, user: string): Promise<unknown> {
  if (!isOpenAIConfigured()) throw new ExperimentAIError("OpenAI is not configured.");
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new ExperimentAIError("OpenAI is not configured.");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!response.ok) throw new ExperimentAIError(`OpenAI error: ${response.status}`);
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new ExperimentAIError("Empty AI response.");
  return JSON.parse(content);
}

export async function generateExperimentDraftWithAI(
  input: Parameters<typeof buildExperimentDraftUserPrompt>[0]
): Promise<ExperimentAiDraftOutput> {
  const raw = await chatJson(
    buildExperimentDraftSystemPrompt(),
    buildExperimentDraftUserPrompt(input)
  );
  return validateAiDraft(raw);
}

export async function interpretExperimentWithAI(
  input: Parameters<typeof buildExperimentInterpretUserPrompt>[0]
): Promise<ExperimentInterpretationJson> {
  const raw = await chatJson(
    buildExperimentInterpretSystemPrompt(),
    buildExperimentInterpretUserPrompt(input)
  );
  return validateInterpretation(raw);
}

export async function interpretExperimentIntelligenceWithAI(
  input: Parameters<typeof buildExperimentIntelligenceUserPrompt>[0]
): Promise<ExperimentIntelligenceInterpretation> {
  const raw = await chatJson(
    buildExperimentIntelligenceSystemPrompt(),
    buildExperimentIntelligenceUserPrompt(input)
  );
  return validateIntelligenceInterpretation(raw);
}
