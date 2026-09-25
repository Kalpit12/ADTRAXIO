import type { AssistantContext } from "@/lib/assistant/types";
import { captureContentBaseline, captureWorkspaceBaseline } from "./baseline";
import type { LearningOutcomeRecord, MetricSnapshot } from "./types";

export async function captureOutcomeSnapshot(
  ctx: AssistantContext,
  record: LearningOutcomeRecord
): Promise<MetricSnapshot> {
  if (record.contentId) {
    return captureContentBaseline(ctx, record.contentId);
  }
  const windowDays = record.baseline.windowDays || 7;
  return captureWorkspaceBaseline(ctx, {
    windowDays,
    platform: record.platform,
  });
}

export function outcomeWindowElapsed(record: LearningOutcomeRecord): boolean {
  return new Date(record.measureAfter).getTime() <= Date.now();
}
