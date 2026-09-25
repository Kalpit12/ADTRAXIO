import { isOpenAIConfigured } from "@/lib/intelligence/openai";
import type { ReportAiSummary, ReportSnapshotData } from "./types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 60_000;

function buildReportSummaryPrompt(data: Omit<ReportSnapshotData, "aiSummary">): string {
  const metricsPayload = {
    period: data.period,
    client: data.client.name,
    overview: data.overview,
    growth: data.growth,
    platforms: data.platforms,
    topContentCount: data.content.length,
    topContent: data.content.slice(0, 5),
    campaigns: data.campaigns.map((c) => ({
      name: c.name,
      status: c.status,
      impressions: c.impressions,
      reach: c.reach,
      engagement: c.engagement,
    })),
    recommendations: data.recommendations.map((r) => ({
      title: r.title,
      recommendation: r.recommendation,
    })),
  };

  return `Analyze this client performance report data and return JSON only.

Rules:
- Use ONLY numbers and facts present in the data below.
- Never invent metrics or percentages not supplied.
- If a metric is null, say it is unavailable — do not treat as zero.
- Keep language professional and suitable for a paying client.

Data:
${JSON.stringify(metricsPayload, null, 2)}

Return JSON with this exact shape:
{
  "executiveSummary": "2-4 sentences",
  "keyObservations": ["string", ...],
  "notableChanges": ["string describing growth/decline with cited numbers", ...],
  "recommendedActions": ["string", ...]
}`;
}

function validateAiSummary(parsed: unknown): ReportAiSummary | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.executiveSummary !== "string" || !obj.executiveSummary.trim()) {
    return null;
  }

  const toStrings = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      : [];

  return {
    executiveSummary: obj.executiveSummary.trim(),
    keyObservations: toStrings(obj.keyObservations),
    notableChanges: toStrings(obj.notableChanges),
    recommendedActions: toStrings(obj.recommendedActions),
  };
}

export async function generateReportAiSummary(
  data: Omit<ReportSnapshotData, "aiSummary">
): Promise<ReportAiSummary | null> {
  if (!data.config.includeAiSummary) return null;
  if (!isOpenAIConfigured()) return null;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

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
              "You write executive summaries for marketing performance reports. Return valid JSON only. Never invent metrics.",
          },
          {
            role: "user",
            content: buildReportSummaryPrompt(data),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;

    try {
      return validateAiSummary(JSON.parse(content));
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function finalizeSnapshotData(
  base: Omit<ReportSnapshotData, "aiSummary">
): Promise<ReportSnapshotData> {
  const aiSummary = await generateReportAiSummary(base);
  return { ...base, aiSummary };
}
