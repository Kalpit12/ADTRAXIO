import { ensureOperationalScope } from "../permissions";
import { isValidUuid } from "../resource-scope";
import type { AssistantContext } from "../types";
import { evaluateOptimizationEligibility } from "@/lib/optimization/eligibility";
import {
  getOptimizationProposal,
  listOptimizationProposals,
  prepareOptimizationProposal,
  previewOptimizationProposal,
} from "@/lib/optimization/service";
import { buildSimulationPreview } from "@/lib/optimization/simulation";
import { assertSupportedProposalType, OptimizationValidationError } from "@/lib/optimization/validation";
import { createPendingAction } from "../confirmations";
import { getExperiment } from "@/lib/experiments/service";
import {
  getOptimizationOutcome,
  listOptimizationOutcomes,
} from "@/lib/optimization/outcome";

export async function getOptimizationOutcomeTool(
  ctx: AssistantContext,
  args: { proposalId?: string }
) {
  ensureOperationalScope(ctx.scope);
  if (!args.proposalId || !isValidUuid(args.proposalId)) {
    return { error: "proposalId (uuid) is required." };
  }
  const outcome = await getOptimizationOutcome(ctx, args.proposalId);
  if (!outcome) {
    return {
      error: "No optimization outcome yet.",
      note: "Execution alone is not an outcome; measurement may still be pending.",
    };
  }
  return {
    outcome,
    execution: outcome.executionSummary,
    measured: outcome.outcomeSummary,
    uncertainty: outcome.limitations,
    labels: {
      execution: "MEASURED allocation change only describes what was applied.",
      outcome: "OBSERVED results apply after the observation window.",
      interpretation: "INTERPRETED summaries are descriptive, not causal.",
      uncertain: "UNCERTAIN when evidence or attribution is limited.",
    },
    note: "Read-only. Cannot execute or change allocation.",
  };
}

export async function getOptimizationOutcomesTool(
  ctx: AssistantContext,
  args: {
    status?: string;
    experimentId?: string;
    platform?: string;
    metric?: string;
    limit?: number;
  }
) {
  ensureOperationalScope(ctx.scope);
  const outcomes = await listOptimizationOutcomes(ctx, {
    status: args.status,
    experimentId: args.experimentId,
    platform: args.platform,
    metric: args.metric,
    limit: args.limit ?? 20,
  });
  return {
    outcomes,
    note:
      "Lists measured optimization outcomes (read-only). Does not rank optimizations or recommend automatic changes.",
  };
}

export async function getOptimizationProposalsTool(
  ctx: AssistantContext,
  args: { limit?: number }
) {
  ensureOperationalScope(ctx.scope);
  const proposals = await listOptimizationProposals(ctx, args.limit ?? 20);
  return {
    proposals,
    note: "Read-only. Assistant cannot approve or execute optimizations.",
  };
}

export async function getOptimizationEligibilityTool(
  ctx: AssistantContext,
  args: {
    sourceType?: string;
    sourceId?: string;
    proposalType?: string;
  }
) {
  ensureOperationalScope(ctx.scope);
  if (!args.sourceType || !args.sourceId || !isValidUuid(args.sourceId)) {
    return { error: "sourceType and sourceId (uuid) are required." };
  }
  let currentState: Record<string, unknown> = {};
  if (args.sourceType === "experiment") {
    const exp = await getExperiment(ctx, args.sourceId);
    if (!exp) return { error: "Experiment not found." };
    currentState = {
      experimentId: exp.id,
      allocations: Object.fromEntries(
        (exp.variants ?? []).map((v) => [v.variantKey, v.allocationPercent])
      ),
      recordedAt: exp.updatedAt,
      status: exp.status,
    };
  }
  let proposalType: import("@/lib/optimization/types").OptimizationProposalType = "allocation_change";
  try {
    proposalType = assertSupportedProposalType(args.proposalType ?? "allocation_change");
  } catch (e) {
    if (e instanceof OptimizationValidationError) {
      return { error: e.message };
    }
    throw e;
  }
  const eligibility = await evaluateOptimizationEligibility(ctx, {
    proposalType,
    sourceType: args.sourceType,
    sourceId: args.sourceId,
    currentState,
  });
  return { eligibility };
}

export async function previewOptimizationTool(
  ctx: AssistantContext,
  args: {
    proposalId?: string;
    currentState?: Record<string, unknown>;
    proposedState?: Record<string, unknown>;
    proposalType?: string;
  }
) {
  ensureOperationalScope(ctx.scope);
  if (args.proposalId && isValidUuid(args.proposalId)) {
    const preview = await previewOptimizationProposal(ctx, args.proposalId);
    if (!preview) return { error: "Proposal not found." };
    return { preview, framing: "Projections only — not performance predictions." };
  }
  if (!args.currentState || !args.proposedState) {
    return { error: "Provide proposalId or both currentState and proposedState." };
  }
  const proposalType = assertSupportedProposalType(args.proposalType ?? "allocation_change");
  const preview = buildSimulationPreview({
    currentState: args.currentState,
    proposedState: args.proposedState,
    proposalType,
    evidenceBasis: [],
  });
  return { preview, framing: "Projections only — not performance predictions." };
}

export async function prepareOptimizationProposalTool(
  ctx: AssistantContext,
  args: {
    sourceType?: string;
    sourceId?: string;
    proposalType?: string;
    objective?: string;
    proposedState?: Record<string, unknown>;
  }
) {
  ensureOperationalScope(ctx.scope);
  if (!args.sourceType || !args.sourceId || !isValidUuid(args.sourceId)) {
    return { error: "sourceType and sourceId (uuid) are required." };
  }
  try {
    const proposal = await prepareOptimizationProposal(ctx, {
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      proposalType: args.proposalType ?? "allocation_change",
      objective: args.objective,
      proposedState: args.proposedState ?? {},
    });
    const detail = await getOptimizationProposal(ctx, proposal.id);
    return {
      proposal: detail ?? proposal,
      reviewUrl: `/assistant/optimization/${proposal.id}`,
      limitations: [
        ...(detail?.limitations ?? proposal.limitations),
        "Draft only — user must review and approve in the optimization UI.",
        "Assistant cannot approve, execute, allocate, publish, or schedule.",
      ],
    };
  } catch (e) {
    if (e instanceof OptimizationValidationError) {
      return { error: e.message };
    }
    throw e;
  }
}

export async function executeOptimizationTool(
  ctx: AssistantContext,
  args: { proposalId?: string },
  meta?: { conversationId: string }
) {
  ensureOperationalScope(ctx.scope);
  if (!meta?.conversationId) {
    return { error: "Missing conversation context for confirmation." };
  }
  if (!args.proposalId || !isValidUuid(args.proposalId)) {
    return { error: "proposalId is required." };
  }
  const proposal = await getOptimizationProposal(ctx, args.proposalId);
  if (!proposal) return { error: "Proposal not found." };
  if (proposal.status !== "approved") {
    return {
      error: "Only approved proposals can be executed. Use preview tools for general questions.",
    };
  }
  if (proposal.proposalType !== "allocation_change") {
    return { error: "Only allocation_change proposals can be executed." };
  }
  const pending = await createPendingAction(ctx, {
    conversationId: meta.conversationId,
    actionType: "execute_optimization",
    payload: { proposalId: args.proposalId },
    summary: `Execute approved allocation change for experiment ${proposal.sourceId}? User must confirm.`,
  });
  return {
    pendingActionId: pending.id,
    expiresAt: pending.expiresAt,
    message:
      "Confirmation required. User must confirm this pending action before allocation changes apply.",
    currentAllocation: proposal.currentState.allocations,
    approvedAllocation: proposal.proposedState.allocations,
  };
}

export async function rollbackOptimizationTool(
  ctx: AssistantContext,
  args: { proposalId?: string },
  meta?: { conversationId: string }
) {
  ensureOperationalScope(ctx.scope);
  if (!meta?.conversationId) {
    return { error: "Missing conversation context for confirmation." };
  }
  if (!args.proposalId || !isValidUuid(args.proposalId)) {
    return { error: "proposalId is required." };
  }
  const proposal = await getOptimizationProposal(ctx, args.proposalId);
  if (!proposal) return { error: "Proposal not found." };
  if (proposal.status !== "executed") {
    return { error: "Only executed proposals can be rolled back." };
  }
  const pending = await createPendingAction(ctx, {
    conversationId: meta.conversationId,
    actionType: "rollback_optimization",
    payload: { proposalId: args.proposalId },
    summary: `Rollback allocation change for experiment ${proposal.sourceId}? User must confirm.`,
  });
  return {
    pendingActionId: pending.id,
    expiresAt: pending.expiresAt,
    message: "Confirmation required before rollback restores the previous allocation.",
    executedAllocation: proposal.execution?.executedAllocation,
    previousAllocation: proposal.execution?.previousAllocation,
  };
}
