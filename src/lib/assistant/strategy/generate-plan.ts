import type { StrategyPlanJson } from "./types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

export async function generateStrategyPlanJson(input: {
  objective: string;
  durationDays: number;
  platforms: string[];
  audience: string | null;
  focus: string | null;
  evidence: Record<string, unknown>;
}): Promise<StrategyPlanJson> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("AI is not configured.");
  }

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You create marketing content strategy plans. Use ONLY evidence provided. Never invent metrics. Return valid JSON.",
        },
        {
          role: "user",
          content: `Create a strategy plan JSON.

Objective: ${input.objective}
Duration (days): ${input.durationDays}
Platforms: ${input.platforms.join(", ") || "not specified"}
Audience: ${input.audience ?? "not specified"}
Focus: ${input.focus ?? "general growth"}

Evidence from workspace:
${JSON.stringify(input.evidence, null, 2)}

Return JSON:
{
  "objective": string,
  "audience": string | null,
  "platforms": string[],
  "contentPillars": [{ "name": string, "reason": string }],
  "cadence": string,
  "durationDays": number,
  "platformStrategy": string,
  "contentIdeas": [{ "title": string, "platform": string, "pillar": string, "description": string }],
  "reasoning": string
}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to generate strategy plan.");
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty strategy response.");

  const parsed = JSON.parse(content) as StrategyPlanJson;
  return {
    ...parsed,
    durationDays: input.durationDays,
    objective: parsed.objective || input.objective,
    platforms: parsed.platforms?.length ? parsed.platforms : input.platforms,
  };
}
