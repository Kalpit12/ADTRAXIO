import type { OptimizationOutcomeRecord } from "./types";

export function parseOptimizationOutcome(raw: unknown): OptimizationOutcomeRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as OptimizationOutcomeRecord;
  if (!o.optimizationProposalId || !o.optimizationExecutionId) return null;
  return o;
}
