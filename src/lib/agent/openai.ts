import { isOpenAIConfigured } from "@/lib/ai/generate-content";
import type { AgentAnalysisFacts } from "./types";
import {
  GrowthBriefValidationError,
  validateBriefOutput,
} from "./validation";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 45_000;

export class GrowthBriefAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GrowthBriefAIError";
  }
}

function buildPrompt(facts: AgentAnalysisFacts): string {
  return `Interpret the following STRUCTURED FACTS for a ${facts.briefType} growth brief.
Do NOT invent metrics, posts, or campaigns. Only interpret what is provided.

Brand goals: ${facts.brandGoals.join("; ") || "none"}
Brand voice hint: ${facts.brandVoice ?? "none"}

Facts JSON:
${JSON.stringify(
  {
    period: facts.periodLabel,
    metricChanges: facts.metricChanges,
    failedPosts: facts.failedPosts,
    scheduledUpcomingCount: facts.scheduledUpcomingCount,
    topContent: facts.topContent,
    contentPatterns: facts.contentPatterns,
    intelligenceRecommendations: facts.intelligenceRecommendations,
    dataGaps: facts.dataGaps,
  },
  null,
  2
)}

Return JSON:
{
  "summary": "2-3 sentences, factual",
  "insights": [{ "type", "title", "observation", "evidence": ["..."], "severity": "info|attention|important", "confidence": "high|medium|low" }],
  "recommendations": [{ "title", "reason", "evidence": ["..."], "actionType": "create_content|create_strategy|review_campaign|review_scheduled_posts|create_report|repurpose_content", "priority": "high|medium|low" }]
}

Distinguish FACT vs INTERPRETATION in observations. Never exaggerate severity.`;
}

export async function interpretFactsWithAI(facts: AgentAnalysisFacts) {
  if (!isOpenAIConfigured()) {
    throw new GrowthBriefAIError("OpenAI is not configured.");
  }
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new GrowthBriefAIError("OpenAI is not configured.");
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
        temperature: 0.25,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are ADTRAXIO AI growth analyst. Use only supplied facts. Never invent data.",
          },
          { role: "user", content: buildPrompt(facts) },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new GrowthBriefAIError("AI interpretation failed.");
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new GrowthBriefAIError("AI returned empty content.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new GrowthBriefValidationError("AI returned malformed JSON.");
    }

    return validateBriefOutput(parsed);
  } finally {
    clearTimeout(timeout);
  }
}
