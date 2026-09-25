import type { AssistantContext } from "@/lib/assistant/types";
import type { StrategyType } from "@/lib/strategist/types";
import { listMeasuredLearnings } from "./service";
import type { LearningConfidence, LearningOutcomeRecord } from "./types";

export const RECENCY_RECENT_DAYS = 30;
export const RECENCY_HISTORICAL_DAYS = 90;

export type LearningRecencyClass = "recent" | "historical" | "stale";

export type SampleStrength =
  | "insufficient"
  | "low"
  | "moderate"
  | "stronger";

export interface RelevantLearning {
  record: LearningOutcomeRecord;
  recency: LearningRecencyClass;
  sampleSize: number | null;
  sampleStrength: SampleStrength;
  platformMatch: boolean;
  objectiveMatch: boolean;
}

export interface GetRelevantLearningsInput {
  objective: string;
  strategyType?: StrategyType;
  platform?: string | null;
  contentType?: string | null;
  limit?: number;
}

function daysSince(iso: string | null): number {
  if (!iso) return 9999;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function classifyRecency(measuredAt: string | null): LearningRecencyClass {
  const days = daysSince(measuredAt);
  if (days <= RECENCY_RECENT_DAYS) return "recent";
  if (days <= RECENCY_HISTORICAL_DAYS) return "historical";
  return "stale";
}

export function inferSampleSize(record: LearningOutcomeRecord): number | null {
  const text = JSON.stringify(record.learning ?? {});
  const match = text.match(/(\d+)\s+comparable/i) ?? text.match(/across\s+(\d+)/i);
  if (match) return Number(match[1]);
  const measuredRows = record.comparison?.rows?.filter(
    (r) => r.availability === "measured"
  );
  if (measuredRows?.length) return measuredRows.length;
  return null;
}

export function classifySampleStrength(size: number | null): SampleStrength {
  if (size == null || size <= 2) return "insufficient";
  if (size <= 5) return "low";
  if (size <= 10) return "moderate";
  return "stronger";
}

function confidenceWeight(c: LearningConfidence): number {
  if (c === "high") return 3;
  if (c === "medium") return 2;
  return 1;
}

function recencyWeight(r: LearningRecencyClass): number {
  if (r === "recent") return 3;
  if (r === "historical") return 2;
  return 1;
}

function sampleWeight(s: SampleStrength): number {
  if (s === "stronger") return 4;
  if (s === "moderate") return 3;
  if (s === "low") return 2;
  return 0;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3);
}

function objectiveOverlap(objective: string, record: LearningOutcomeRecord): boolean {
  const objTokens = new Set(tokenize(objective));
  const hay = `${record.objective} ${JSON.stringify(record.learning)}`.toLowerCase();
  let hits = 0;
  for (const t of objTokens) {
    if (hay.includes(t)) hits += 1;
  }
  return hits >= 2;
}

function strategyTypeHints(type?: StrategyType): string[] {
  switch (type) {
    case "engagement_recovery":
      return ["engagement", "recover", "educational", "content"];
    case "content_growth":
      return ["content", "create", "growth"];
    case "consistency":
      return ["publish", "frequency", "schedule"];
    case "campaign_push":
      return ["campaign"];
    default:
      return [];
  }
}

function rankScore(
  item: RelevantLearning,
  input: GetRelevantLearningsInput
): number {
  let score = 0;
  score += confidenceWeight(item.record.confidence);
  score += recencyWeight(item.recency);
  score += sampleWeight(item.sampleStrength);
  if (item.platformMatch) score += 3;
  if (item.objectiveMatch) score += 3;
  const hints = strategyTypeHints(input.strategyType);
  const blob = `${item.record.objective} ${JSON.stringify(item.record.learning)}`.toLowerCase();
  for (const h of hints) {
    if (blob.includes(h)) score += 1;
  }
  return score;
}

export async function getRelevantLearnings(
  ctx: AssistantContext,
  input: GetRelevantLearningsInput
): Promise<RelevantLearning[]> {
  const records = await listMeasuredLearnings(ctx, {
    limit: 40,
    platform: input.platform ?? null,
  });

  const platform = input.platform?.toLowerCase() ?? null;
  const relevant: RelevantLearning[] = [];

  for (const record of records) {
    const recency = classifyRecency(record.measuredAt);
    const sampleSize = inferSampleSize(record);
    const sampleStrength = classifySampleStrength(sampleSize);
    const platformMatch = platform
      ? (record.platform?.toLowerCase() ?? "") === platform
      : false;
    const objectiveMatch = objectiveOverlap(input.objective, record);

    relevant.push({
      record,
      recency,
      sampleSize,
      sampleStrength,
      platformMatch,
      objectiveMatch,
    });
  }

  relevant.sort(
    (a, b) => rankScore(b, input) - rankScore(a, input)
  );

  const limit = input.limit ?? 8;
  const top = relevant.slice(0, limit);

  if (input.platform) {
    const platformSpecific = top.filter((r) => r.platformMatch);
    if (platformSpecific.length >= 2) {
      return platformSpecific.slice(0, limit);
    }
  }

  return top;
}

export function formatRelevantLearningsForPrompt(items: RelevantLearning[]): string {
  if (!items.length) {
    return "No validated historical learnings matched this objective yet. Base the strategy primarily on CURRENT period evidence.";
  }

  const lines: string[] = [
    "HISTORICAL VALIDATED LEARNINGS (not current performance — do not present as live metrics):",
  ];

  for (const item of items) {
    const learning = item.record.learning as {
      summary?: string;
      learnings?: Array<{ statement: string }>;
    };
    const summary = learning.summary ?? item.record.objective;
    const sample =
      item.sampleSize != null
        ? `Sample: ${item.sampleSize} comparable unit(s) (${item.sampleStrength}).`
        : `Sample strength: ${item.sampleStrength}.`;
    lines.push(
      `- [learningId: ${item.record.id}] [${item.recency}] [${item.record.confidence} confidence] ${summary}`
    );
    lines.push(`  ${sample}`);
    for (const l of learning.learnings?.slice(0, 2) ?? []) {
      lines.push(`  · ${l.statement}`);
    }
  }

  lines.push(
    "If learnings conflict, state mixed evidence — do not fabricate a winner. Prefer recent + larger samples when relevant."
  );
  return lines.join("\n");
}

export function detectMixedEvidence(items: RelevantLearning[]): boolean {
  const statements: string[] = [];
  for (const item of items) {
    const learning = item.record.learning as {
      learnings?: Array<{ statement: string }>;
    };
    for (const l of learning.learnings ?? []) {
      statements.push(l.statement.toLowerCase());
    }
  }
  const hasEducational = statements.some((s) => s.includes("educational"));
  const hasVideo = statements.some((s) => s.includes("video") || s.includes("short-form"));
  const hasPromo = statements.some((s) => s.includes("promotional"));
  return (hasEducational && hasVideo) || (hasEducational && hasPromo && hasVideo);
}
