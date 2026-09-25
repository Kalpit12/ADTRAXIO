import type { AssistantContext } from "@/lib/assistant/types";
import { getRelevantLearnings } from "./relevance";
import { listMeasuredLearnings } from "./service";
import type { LearningOutcomeRecord } from "./types";

export async function loadLearningsForStrategist(
  ctx: AssistantContext,
  limit = 8,
  objective = "growth strategy"
): Promise<LearningOutcomeRecord[]> {
  const relevant = await getRelevantLearnings(ctx, { objective, limit });
  if (relevant.length) return relevant.map((r) => r.record);
  return listMeasuredLearnings(ctx, { limit, platform: null });
}

export function formatLearningsForPrompt(records: LearningOutcomeRecord[]): string {
  if (!records.length) return "No validated historical learnings yet.";
  const lines: string[] = [];
  for (const r of records) {
    const learning = r.learning as { summary?: string; learnings?: Array<{ statement: string }> };
    const summary = learning.summary ?? r.objective;
    lines.push(`- [${r.confidence}] ${summary}`);
    for (const item of learning.learnings?.slice(0, 2) ?? []) {
      lines.push(`  · ${item.statement}`);
    }
  }
  return lines.join("\n");
}
