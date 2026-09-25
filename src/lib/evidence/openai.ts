import { isOpenAIConfigured } from "@/lib/ai/generate-content";
import type { CrossExperimentEvidenceResult } from "./types";
import type { CrossExperimentInterpretation } from "./types";

export class EvidenceAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvidenceAIError";
  }
}

const FORBIDDEN = /\b(winner|statistical significance|caused|proven|optimize allocation)\b/i;

export function buildDeterministicCrossExperimentSummary(
  evidence: CrossExperimentEvidenceResult
): CrossExperimentInterpretation {
  return {
    version: 1,
    summary: evidence.summary,
    observations: evidence.supportingObservations.slice(0, 5).map(
      (o) =>
        `OBSERVED: ${o.experimentName} (${o.experimentId}) — higher observed variant ${o.higherObservedVariantKey ?? "unclear"} for ${o.metric}.`
    ),
    interpretations: [
      "INTERPRETED: Patterns may reflect audience response but are not proven causal.",
    ],
    conflicts: evidence.conflictingObservations.slice(0, 3).map(
      (o) => `CONFLICT: ${o.experimentName} observed variant ${o.higherObservedVariantKey ?? "unclear"}.`
    ),
    limitations: evidence.limitations,
    considerations: [
      "UNCERTAIN: Do not treat cross-experiment patterns as universal rules.",
    ],
    interpretedAt: new Date().toISOString(),
  };
}

function validateInterpretation(raw: unknown): CrossExperimentInterpretation {
  if (!raw || typeof raw !== "object") throw new EvidenceAIError("Invalid JSON.");
  const obj = raw as Record<string, unknown>;
  const blob = JSON.stringify(obj);
  if (FORBIDDEN.test(blob)) throw new EvidenceAIError("Forbidden language.");
  return {
    version: 1,
    summary: String(obj.summary ?? "").slice(0, 2000),
    observations: Array.isArray(obj.observations)
      ? obj.observations.map((s) => String(s).slice(0, 500)).slice(0, 10)
      : [],
    interpretations: Array.isArray(obj.interpretations)
      ? obj.interpretations.map((s) => String(s).slice(0, 500)).slice(0, 8)
      : [],
    conflicts: Array.isArray(obj.conflicts)
      ? obj.conflicts.map((s) => String(s).slice(0, 500)).slice(0, 8)
      : [],
    limitations: Array.isArray(obj.limitations)
      ? obj.limitations.map((s) => String(s).slice(0, 500)).slice(0, 8)
      : [],
    considerations: Array.isArray(obj.considerations)
      ? obj.considerations.map((s) => String(s).slice(0, 500)).slice(0, 8)
      : [],
    interpretedAt: new Date().toISOString(),
  };
}

export async function interpretCrossExperimentEvidenceWithAI(
  evidence: CrossExperimentEvidenceResult
): Promise<CrossExperimentInterpretation> {
  if (!isOpenAIConfigured()) throw new EvidenceAIError("OpenAI not configured.");
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new EvidenceAIError("OpenAI not configured.");

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
        {
          role: "system",
          content:
            "Summarize cross-experiment evidence only. No causation, significance, winners, or optimization. Return strict JSON with summary, observations[], interpretations[], conflicts[], limitations[], considerations[].",
        },
        {
          role: "user",
          content: JSON.stringify(evidence, null, 2),
        },
      ],
    }),
  });

  if (!response.ok) throw new EvidenceAIError(`OpenAI error: ${response.status}`);
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new EvidenceAIError("Empty response.");
  return validateInterpretation(JSON.parse(content));
}
