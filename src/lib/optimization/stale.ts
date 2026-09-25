import type { AssistantContext } from "@/lib/assistant/types";
import { getExperiment } from "@/lib/experiments/service";
import type { OptimizationProposalRecord } from "./types";
import { evaluateOptimizationEligibility } from "./eligibility";

export interface StaleCheckResult {
  stale: boolean;
  reasons: string[];
}

export async function verifyProposalFreshness(
  ctx: AssistantContext,
  proposal: OptimizationProposalRecord
): Promise<StaleCheckResult> {
  const reasons: string[] = [];

  if (new Date(proposal.expiresAt).getTime() < Date.now()) {
    reasons.push("Proposal has expired.");
  }

  if (proposal.sourceType === "experiment") {
    const exp = await getExperiment(ctx, proposal.sourceId);
    if (!exp) reasons.push("Source experiment no longer exists.");
    else if (
      proposal.proposalType === "allocation_change" &&
      exp.status === "running"
    ) {
      /* running experiments are valid for allocation proposals */
    } else if (exp.status !== "completed") {
      reasons.push("Source experiment is no longer completed.");
    }
    const recorded = proposal.currentState.recordedAt as string | undefined;
    const runningAllocation =
      proposal.proposalType === "allocation_change" && exp?.status === "running";
    if (
      recorded &&
      exp?.updatedAt &&
      exp.updatedAt !== recorded &&
      !runningAllocation
    ) {
      reasons.push("Source experiment state changed since proposal creation.");
    }
    const curAlloc = JSON.stringify(proposal.currentState.allocations ?? {});
    const liveAlloc = JSON.stringify(
      Object.fromEntries(
        (exp?.variants ?? []).map((v) => [v.variantKey, v.allocationPercent])
      )
    );
    if (exp && curAlloc !== liveAlloc) {
      reasons.push("Current allocation no longer matches recorded current state.");
    }
  }

  const eligibility = await evaluateOptimizationEligibility(ctx, {
    proposalType: proposal.proposalType,
    sourceType: proposal.sourceType,
    sourceId: proposal.sourceId,
    currentState: proposal.currentState,
  });
  if (eligibility.status !== "eligible") {
    reasons.push(`Eligibility no longer valid: ${eligibility.status}.`);
  }

  return { stale: reasons.length > 0, reasons };
}
