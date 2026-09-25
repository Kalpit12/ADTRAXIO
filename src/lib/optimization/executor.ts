import type { AssistantContext } from "@/lib/assistant/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateOptimizationEligibility } from "./eligibility";
import {
  assertAllocationChangeProposal,
  liveAllocationMap,
  loadRunningExperimentForAllocation,
  parseAllocationMap,
  validateProposedAllocations,
  verifyRecordedCurrentState,
  allocationsMatch,
} from "./execution-safety";
import { getOptimizationProposal } from "./service";
import type {
  OptimizationAuditEntry,
  OptimizationExecutionRecord,
  OptimizationProposalRecord,
  OptimizationProposalStatus,
} from "./types";
import { OptimizationValidationError } from "./validation";

function auditEntry(
  ctx: AssistantContext,
  proposal: OptimizationProposalRecord,
  input: {
    event: OptimizationAuditEntry["event"];
    previousStatus: OptimizationProposalStatus | null;
    newStatus: OptimizationProposalStatus;
    reason: string;
    experimentId?: string;
    previousAllocation?: Record<string, number>;
    newAllocation?: Record<string, number>;
    result?: OptimizationAuditEntry["result"];
  }
): OptimizationAuditEntry {
  return {
    at: new Date().toISOString(),
    actorId: ctx.user.id,
    previousStatus: input.previousStatus,
    newStatus: input.newStatus,
    reason: input.reason,
    event: input.event,
    experimentId: input.experimentId,
    previousAllocation: input.previousAllocation,
    newAllocation: input.newAllocation,
    result: input.result,
    affectedResource: proposal.sourceId,
    workspaceId: ctx.clientWorkspaceId,
  };
}

async function verifyApprovalIntegrity(
  ctx: AssistantContext,
  proposal: OptimizationProposalRecord
): Promise<void> {
  if (proposal.status !== "approved" && proposal.status !== "executed") {
    throw new OptimizationValidationError("Proposal must be approved before execution.");
  }
  if (!proposal.approvedBy || !proposal.approvedAt) {
    throw new OptimizationValidationError("Approval metadata is missing.");
  }
  const { data: member } = await ctx.supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", ctx.organizationId)
    .eq("user_id", proposal.approvedBy)
    .maybeSingle();
  if (!member) {
    throw new OptimizationValidationError("Approver is not a valid organization member.");
  }
}

async function revalidateForExecution(
  ctx: AssistantContext,
  proposal: OptimizationProposalRecord
): Promise<{ expId: string; proposed: Record<string, number>; previous: Record<string, number> }> {
  assertAllocationChangeProposal(proposal);
  if (new Date(proposal.expiresAt).getTime() < Date.now()) {
    throw new OptimizationValidationError("Proposal has expired.");
  }
  await verifyApprovalIntegrity(ctx, proposal);

  const exp = await loadRunningExperimentForAllocation(ctx, proposal.sourceId);
  const live = liveAllocationMap(exp);
  verifyRecordedCurrentState(proposal, live);
  const proposed = parseAllocationMap(proposal.proposedState);
  validateProposedAllocations(exp, proposed);

  const eligibility = await evaluateOptimizationEligibility(ctx, {
    proposalType: proposal.proposalType,
    sourceType: proposal.sourceType,
    sourceId: proposal.sourceId,
    currentState: { ...proposal.currentState, allocations: live },
  });
  if (eligibility.status !== "eligible") {
    throw new OptimizationValidationError(`Not eligible for execution: ${eligibility.status}`);
  }

  return { expId: exp.id, proposed, previous: live };
}

async function applyAllocationRpc(
  ctx: AssistantContext,
  experimentId: string,
  allocations: Record<string, number>
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) {
    throw new OptimizationValidationError("Server is not configured for allocation execution.");
  }
  const { error } = await admin.rpc("apply_experiment_allocation_change", {
    p_experiment_id: experimentId,
    p_organization_id: ctx.organizationId,
    p_allocations: allocations,
  });
  if (error) {
    const msg = error.message ?? "Allocation update failed.";
    if (msg.includes("experiment_not_running")) {
      throw new OptimizationValidationError("Experiment is not running.");
    }
    if (msg.includes("allocation_total_not_100")) {
      throw new OptimizationValidationError("Allocation must total 100%.");
    }
    if (msg.includes("variant")) {
      throw new OptimizationValidationError("Variant validation failed during execution.");
    }
    throw new OptimizationValidationError(msg);
  }
}

async function markProposalReview(
  ctx: AssistantContext,
  proposal: OptimizationProposalRecord,
  reason: string
): Promise<void> {
  const audit = [...proposal.auditLog, auditEntry(ctx, proposal, {
    event: "execution_failed",
    previousStatus: proposal.status,
    newStatus: "review",
    reason,
    result: "blocked",
    experimentId: proposal.sourceId,
  })];
  await ctx.supabase
    .from("ai_optimization_proposals")
    .update({
      status: "review",
      execution_lock_at: null,
      audit_log_json: audit,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposal.id)
    .eq("organization_id", ctx.organizationId);
}

export async function getOptimizationExecution(
  ctx: AssistantContext,
  proposalId: string
): Promise<OptimizationExecutionRecord | null> {
  const proposal = await getOptimizationProposal(ctx, proposalId);
  return proposal?.execution ?? null;
}

export async function executeOptimizationProposal(
  ctx: AssistantContext,
  proposalId: string
): Promise<{ proposal: OptimizationProposalRecord; execution: OptimizationExecutionRecord }> {
  const proposal = await getOptimizationProposal(ctx, proposalId);
  if (!proposal) throw new OptimizationValidationError("Proposal not found.");

  if (proposal.status === "executed" && proposal.execution) {
    return { proposal, execution: proposal.execution };
  }
  if (proposal.status === "rolled_back") {
    throw new OptimizationValidationError("Proposal was rolled back and cannot be executed again.");
  }
  if (proposal.proposalType !== "allocation_change") {
    throw new OptimizationValidationError("Only allocation_change proposals can be executed.");
  }

  const lockNow = new Date().toISOString();
  const { data: locked, error: lockError } = await ctx.supabase
    .from("ai_optimization_proposals")
    .update({ execution_lock_at: lockNow })
    .eq("id", proposalId)
    .eq("organization_id", ctx.organizationId)
    .eq("status", "approved")
    .is("execution_lock_at", null)
    .select("*")
    .maybeSingle();

  if (lockError) throw new Error(lockError.message);

  if (!locked) {
    const latest = await getOptimizationProposal(ctx, proposalId);
    if (latest?.status === "executed" && latest.execution) {
      return { proposal: latest, execution: latest.execution };
    }
    throw new OptimizationValidationError(
      "Execution lock unavailable. Proposal may be executing or not approved."
    );
  }

  const lockedProposal = (await getOptimizationProposal(ctx, proposalId))!;
  const startedAudit = [
    ...lockedProposal.auditLog,
    auditEntry(ctx, lockedProposal, {
      event: "execution_started",
      previousStatus: lockedProposal.status,
      newStatus: lockedProposal.status,
      reason: "Execution started.",
      experimentId: lockedProposal.sourceId,
    }),
  ];
  await ctx.supabase
    .from("ai_optimization_proposals")
    .update({ audit_log_json: startedAudit, updated_at: new Date().toISOString() })
    .eq("id", proposalId);

  try {
    const { expId, proposed, previous } = await revalidateForExecution(ctx, lockedProposal);
    const executionId = crypto.randomUUID();
    const executedAt = new Date().toISOString();
    const execution: OptimizationExecutionRecord = {
      id: executionId,
      proposalId,
      experimentId: expId,
      status: "pending_measurement",
      message: "Optimization applied. Outcome measurement is pending.",
      previousAllocation: previous,
      executedAllocation: proposed,
      executedAt,
      executedBy: ctx.user.id,
    };

    await applyAllocationRpc(ctx, expId, proposed);

    const successAudit = [
      ...startedAudit,
      auditEntry(ctx, lockedProposal, {
        event: "execution_succeeded",
        previousStatus: "approved",
        newStatus: "executed",
        reason: execution.message,
        experimentId: expId,
        previousAllocation: previous,
        newAllocation: proposed,
        result: "success",
      }),
    ];

    const { data: updated, error: updateError } = await ctx.supabase
      .from("ai_optimization_proposals")
      .update({
        status: "executed",
        executed_at: executedAt,
        execution_id: executionId,
        execution_json: execution,
        execution_lock_at: null,
        audit_log_json: successAudit,
        updated_at: executedAt,
      })
      .eq("id", proposalId)
      .eq("organization_id", ctx.organizationId)
      .select("*")
      .single();

    if (updateError) throw new Error(updateError.message);

    const mapped = await getOptimizationProposal(ctx, proposalId);
    const { initializeOptimizationOutcome } = await import("./outcome");
    if (mapped) {
      await initializeOptimizationOutcome(ctx, mapped, execution);
    }
    const refreshed = await getOptimizationProposal(ctx, proposalId);
    return { proposal: refreshed ?? mapped!, execution };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Execution failed.";
    const failedAudit = [
      ...startedAudit,
      auditEntry(ctx, lockedProposal, {
        event: "execution_failed",
        previousStatus: "approved",
        newStatus: "approved",
        reason,
        experimentId: lockedProposal.sourceId,
        result: "failed",
      }),
    ];
    await ctx.supabase
      .from("ai_optimization_proposals")
      .update({
        execution_lock_at: null,
        audit_log_json: failedAudit,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposalId);

    if (
      error instanceof OptimizationValidationError &&
      (reason.includes("stale") ||
        reason.includes("match") ||
        reason.includes("eligible") ||
        reason.includes("running"))
    ) {
      await markProposalReview(ctx, lockedProposal, reason);
    }
    throw error;
  }
}

export async function rollbackOptimizationProposal(
  ctx: AssistantContext,
  proposalId: string
): Promise<{ proposal: OptimizationProposalRecord; execution: OptimizationExecutionRecord }> {
  const proposal = await getOptimizationProposal(ctx, proposalId);
  if (!proposal) throw new OptimizationValidationError("Proposal not found.");

  if (proposal.status === "rolled_back" && proposal.execution) {
    return { proposal, execution: proposal.execution };
  }
  if (proposal.status !== "executed" || !proposal.execution) {
    throw new OptimizationValidationError("Only executed proposals can be rolled back.");
  }

  const lockNow = new Date().toISOString();
  const { data: locked } = await ctx.supabase
    .from("ai_optimization_proposals")
    .update({ execution_lock_at: lockNow })
    .eq("id", proposalId)
    .eq("organization_id", ctx.organizationId)
    .eq("status", "executed")
    .is("execution_lock_at", null)
    .select("*")
    .maybeSingle();

  if (!locked) {
    const latest = await getOptimizationProposal(ctx, proposalId);
    if (latest?.status === "rolled_back" && latest.execution) {
      return { proposal: latest, execution: latest.execution };
    }
    throw new OptimizationValidationError("Rollback lock unavailable.");
  }

  const execution = proposal.execution;
  const startedAudit = [
    ...proposal.auditLog,
    auditEntry(ctx, proposal, {
      event: "rollback_started",
      previousStatus: "executed",
      newStatus: "executed",
      reason: "Rollback started.",
      experimentId: execution.experimentId,
    }),
  ];

  try {
    const exp = await loadRunningExperimentForAllocation(ctx, execution.experimentId);
    const live = liveAllocationMap(exp);
    if (!allocationsMatch(live, execution.executedAllocation)) {
      throw new OptimizationValidationError(
        "Current allocation does not match executed state. Manual review required."
      );
    }

    await applyAllocationRpc(ctx, execution.experimentId, execution.previousAllocation);

    const rolledAt = new Date().toISOString();
    const updatedExecution: OptimizationExecutionRecord = {
      ...execution,
      rolledBackAt: rolledAt,
      rolledBackBy: ctx.user.id,
      message: "Allocation restored to pre-optimization state. Outcome measurement is pending.",
    };

    const successAudit = [
      ...startedAudit,
      auditEntry(ctx, proposal, {
        event: "rollback_succeeded",
        previousStatus: "executed",
        newStatus: "rolled_back",
        reason: "Rollback succeeded.",
        experimentId: execution.experimentId,
        previousAllocation: execution.executedAllocation,
        newAllocation: execution.previousAllocation,
        result: "success",
      }),
    ];

    await ctx.supabase
      .from("ai_optimization_proposals")
      .update({
        status: "rolled_back",
        execution_json: updatedExecution,
        execution_lock_at: null,
        audit_log_json: successAudit,
        updated_at: rolledAt,
      })
      .eq("id", proposalId);

    const mapped = await getOptimizationProposal(ctx, proposalId);
    return { proposal: mapped!, execution: updatedExecution };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Rollback failed.";
    await ctx.supabase
      .from("ai_optimization_proposals")
      .update({
        execution_lock_at: null,
        audit_log_json: [
          ...startedAudit,
          auditEntry(ctx, proposal, {
            event: "rollback_failed",
            previousStatus: "executed",
            newStatus: "executed",
            reason,
            experimentId: execution.experimentId,
            result: "failed",
          }),
        ],
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposalId);
    throw error;
  }
}
