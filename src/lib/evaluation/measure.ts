import type { StrategyEvaluationRecord } from "./types";

export function evaluationWindowElapsed(record: StrategyEvaluationRecord): boolean {
  return new Date(record.measureAfter).getTime() <= Date.now();
}
