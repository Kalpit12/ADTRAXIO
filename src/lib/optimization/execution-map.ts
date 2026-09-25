import type { OptimizationExecutionRecord } from "./types";

export function parseExecution(row: {
  execution_id: string | null;
  execution_json: unknown;
  executed_at: string | null;
}): OptimizationExecutionRecord | null {
  if (!row.execution_id || !row.execution_json || typeof row.execution_json !== "object") {
    return null;
  }
  const json = row.execution_json as OptimizationExecutionRecord;
  if (!json.proposalId) return null;
  return {
    ...json,
    id: row.execution_id,
    executedAt: json.executedAt ?? row.executed_at ?? "",
  };
}
