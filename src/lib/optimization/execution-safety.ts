import type { AssistantContext } from "@/lib/assistant/types";
import { validateFixedSplitAllocation } from "@/lib/experiments/allocation";
import { getExperiment } from "@/lib/experiments/service";
import type { ExperimentRecord } from "@/lib/experiments/types";
import type { OptimizationProposalRecord } from "./types";
import { OptimizationValidationError } from "./validation";

export function parseAllocationMap(
  state: Record<string, unknown>
): Record<string, number> {
  const raw = state.allocations;
  if (!raw || typeof raw !== "object") {
    throw new OptimizationValidationError("Missing allocations in proposal state.");
  }
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      throw new OptimizationValidationError(`Invalid allocation for variant ${key}.`);
    }
    out[key] = n;
  }
  return out;
}

export function liveAllocationMap(exp: ExperimentRecord): Record<string, number> {
  return Object.fromEntries(
    (exp.variants ?? []).map((v) => [v.variantKey, v.allocationPercent])
  );
}

export function allocationsMatch(
  a: Record<string, number>,
  b: Record<string, number>
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function loadRunningExperimentForAllocation(
  ctx: AssistantContext,
  experimentId: string
): Promise<ExperimentRecord> {
  const exp = await getExperiment(ctx, experimentId);
  if (!exp) throw new OptimizationValidationError("Target experiment not found.");
  if (exp.status !== "running") {
    throw new OptimizationValidationError("Allocation changes require a running experiment.");
  }
  return exp;
}

export function validateProposedAllocations(
  exp: ExperimentRecord,
  proposed: Record<string, number>
): void {
  const keys = new Set((exp.variants ?? []).map((v) => v.variantKey));
  const proposedKeys = Object.keys(proposed);
  if (proposedKeys.length !== keys.size) {
    throw new OptimizationValidationError("Proposed allocation includes unexpected variants.");
  }
  for (const key of proposedKeys) {
    if (!keys.has(key)) {
      throw new OptimizationValidationError(`Unexpected variant key: ${key}.`);
    }
  }
  for (const key of keys) {
    if (proposed[key] == null) {
      throw new OptimizationValidationError(`Missing allocation for variant ${key}.`);
    }
  }
  validateFixedSplitAllocation(
    (exp.variants ?? []).map((v) => ({
      variantKey: v.variantKey,
      allocationPercent: proposed[v.variantKey],
    }))
  );
}

export function verifyRecordedCurrentState(
  proposal: OptimizationProposalRecord,
  live: Record<string, number>
): void {
  const recorded = parseAllocationMap(proposal.currentState);
  if (!allocationsMatch(recorded, live)) {
    throw new OptimizationValidationError(
      "Live allocation does not match proposal recorded current state."
    );
  }
}

export function assertAllocationChangeProposal(proposal: OptimizationProposalRecord): void {
  if (proposal.proposalType !== "allocation_change") {
    throw new OptimizationValidationError(
      `Only allocation_change proposals can be executed (got ${proposal.proposalType}).`
    );
  }
  if (proposal.sourceType !== "experiment") {
    throw new OptimizationValidationError("Only experiment allocation proposals are supported.");
  }
}
