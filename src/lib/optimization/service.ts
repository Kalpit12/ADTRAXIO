import type { AssistantContext } from "@/lib/assistant/types";
import { applyClientWorkspaceScope } from "@/lib/workspaces/query-scope";
import { getExperiment } from "@/lib/experiments/service";
import { OPTIMIZATION_PROPOSAL_TTL_HOURS } from "./constants";
import { evaluateOptimizationEligibility } from "./eligibility";
import { assessOptimizationRisk } from "./risk";
import { buildSimulationPreview } from "./simulation";
import { verifyProposalFreshness } from "./stale";
import type {
  EligibilityReport,
  OptimizationAuditEntry,
  OptimizationProposalRecord,
  OptimizationProposalStatus,
  OptimizationProposalType,
  RiskReport,
  RollbackMetadata,
  SimulationPreview,
} from "./types";
import { parseExecution } from "./execution-map";
import { parseOptimizationOutcome } from "./outcome-map";
import { assertSupportedProposalType, OptimizationValidationError } from "./validation";

type ProposalRow = {
  id: string;
  organization_id: string;
  client_workspace_id: string | null;
  created_by: string;
  source_type: string;
  source_id: string;
  proposal_type: string;
  objective: string;
  status: string;
  current_state_json: unknown;
  proposed_state_json: unknown;
  projected_state_json: unknown;
  evidence_json: unknown;
  eligibility_json: unknown;
  risk_json: unknown;
  simulation_json: unknown;
  limitations_json: unknown;
  rollback_state_json: unknown;
  audit_log_json: unknown;
  approved_by: string | null;
  approved_at: string | null;
  expires_at: string;
  executed_at: string | null;
  execution_id: string | null;
  execution_json: unknown;
  execution_lock_at: string | null;
  outcome_json: unknown;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
};

function clientWorkspaceIdForInsert(ctx: AssistantContext): string | null {
  return ctx.isAgency ? ctx.clientWorkspaceId : null;
}

function mapRow(row: ProposalRow): OptimizationProposalRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientWorkspaceId: row.client_workspace_id,
    createdBy: row.created_by,
    sourceType: row.source_type,
    sourceId: row.source_id,
    proposalType: row.proposal_type as OptimizationProposalType,
    objective: row.objective,
    status: row.status as OptimizationProposalStatus,
    currentState: (row.current_state_json as Record<string, unknown>) ?? {},
    proposedState: (row.proposed_state_json as Record<string, unknown>) ?? {},
    projectedState: (row.projected_state_json as Record<string, unknown>) ?? {},
    evidence: (row.evidence_json as Record<string, unknown>) ?? {},
    eligibility: (row.eligibility_json as EligibilityReport) ?? {
      status: "insufficient_evidence",
      reasons: [],
      supportingEvidence: [],
      limitations: [],
      evaluatedAt: new Date().toISOString(),
    },
    risk: (row.risk_json as RiskReport) ?? {
      level: "blocked",
      factors: [],
      limitations: [],
      requiresExtraConfirmation: false,
    },
    simulation: (row.simulation_json as SimulationPreview) ?? {
      currentState: {},
      proposedState: {},
      affectedResources: [],
      expectedDifference: [],
      evidenceBasis: [],
      limitations: [],
    },
    limitations: Array.isArray(row.limitations_json)
      ? (row.limitations_json as string[])
      : [],
    rollbackState: (row.rollback_state_json as RollbackMetadata) ?? {},
    auditLog: Array.isArray(row.audit_log_json)
      ? (row.audit_log_json as OptimizationAuditEntry[])
      : [],
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    expiresAt: row.expires_at,
    executedAt: row.executed_at,
    executionId: row.execution_id ?? null,
    execution: parseExecution({
      execution_id: row.execution_id,
      execution_json: row.execution_json,
      executed_at: row.executed_at,
    }),
    outcome: parseOptimizationOutcome(row.outcome_json),
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function appendAudit(
  log: OptimizationAuditEntry[],
  entry: OptimizationAuditEntry
): OptimizationAuditEntry[] {
  return [...log, entry];
}

function expiresAtFromNow(): string {
  const d = new Date();
  d.setHours(d.getHours() + OPTIMIZATION_PROPOSAL_TTL_HOURS);
  return d.toISOString();
}

export async function getOptimizationProposal(
  ctx: AssistantContext,
  id: string
): Promise<OptimizationProposalRecord | null> {
  const { data, error } = await applyClientWorkspaceScope(
    ctx.supabase
      .from("ai_optimization_proposals")
      .select("*")
      .eq("id", id)
      .eq("organization_id", ctx.organizationId),
    ctx.scope
  ).maybeSingle();
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return null;
    throw new Error(error.message);
  }
  return data ? mapRow(data) : null;
}

export async function listOptimizationProposals(
  ctx: AssistantContext,
  limit = 20
): Promise<OptimizationProposalRecord[]> {
  const { data, error } = await applyClientWorkspaceScope(
    ctx.supabase
      .from("ai_optimization_proposals")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: false })
      .limit(limit),
    ctx.scope
  );
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(mapRow);
}

export async function prepareOptimizationProposal(
  ctx: AssistantContext,
  input: {
    sourceType: string;
    sourceId: string;
    proposalType: string;
    objective?: string;
    proposedState: Record<string, unknown>;
    idempotencyKey?: string;
  }
): Promise<OptimizationProposalRecord> {
  const proposalType = assertSupportedProposalType(input.proposalType);
  let currentState: Record<string, unknown> = {};
  let evidence: Record<string, unknown> = {};
  let platform: string | null = null;

  if (input.sourceType === "experiment") {
    const exp = await getExperiment(ctx, input.sourceId);
    if (!exp) throw new OptimizationValidationError("Experiment not found.");
    platform = exp.platform;
    currentState = {
      experimentId: exp.id,
      allocations: Object.fromEntries(
        (exp.variants ?? []).map((v) => [v.variantKey, v.allocationPercent])
      ),
      recordedAt: exp.updatedAt,
      status: exp.status,
    };
    evidence = {
      experimentId: exp.id,
      hypothesis: exp.hypothesis,
      metric: exp.successMetric,
      crossExperimentTrace: exp.id,
    };
  }

  const eligibility = await evaluateOptimizationEligibility(ctx, {
    proposalType,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    currentState,
  });

  const simulation = buildSimulationPreview({
    currentState,
    proposedState: input.proposedState,
    proposalType,
    evidenceBasis: eligibility.supportingEvidence,
  });

  const risk = assessOptimizationRisk({
    eligibility,
    simulation,
    proposalType,
    platform,
  });

  const limitations = [
    ...eligibility.limitations,
    ...simulation.limitations,
    "No automatic execution — human review required.",
  ];

  const idempotencyKey =
    input.idempotencyKey ?? `proposal:${input.sourceType}:${input.sourceId}:${proposalType}`;

  const audit: OptimizationAuditEntry[] = [
    {
      at: new Date().toISOString(),
      actorId: ctx.user.id,
      previousStatus: null,
      newStatus: "draft",
      reason: "Proposal created (draft only).",
      sourceEvidence: eligibility.supportingEvidence,
      affectedResource: input.sourceId,
      workspaceId: ctx.clientWorkspaceId,
    },
  ];

  const { data, error } = await ctx.supabase
    .from("ai_optimization_proposals")
    .insert({
      organization_id: ctx.organizationId,
      client_workspace_id: clientWorkspaceIdForInsert(ctx),
      created_by: ctx.user.id,
      source_type: input.sourceType,
      source_id: input.sourceId,
      proposal_type: proposalType,
      objective: input.objective ?? "",
      status: "draft",
      current_state_json: currentState,
      proposed_state_json: input.proposedState,
      projected_state_json: simulation.proposedState,
      evidence_json: evidence,
      eligibility_json: eligibility,
      risk_json: risk,
      simulation_json: simulation,
      limitations_json: limitations,
      rollback_state_json: {},
      audit_log_json: audit,
      expires_at: expiresAtFromNow(),
      idempotency_key: idempotencyKey,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const existing = await getProposalByIdempotency(ctx, idempotencyKey);
      if (existing) return existing;
    }
    if (error.code === "42P01" || error.code === "PGRST205") {
      throw new Error("Optimization proposals table missing. Apply migration 036.");
    }
    throw new Error(error.message);
  }
  return mapRow(data as ProposalRow);
}

async function getProposalByIdempotency(
  ctx: AssistantContext,
  key: string
): Promise<OptimizationProposalRecord | null> {
  const { data } = await ctx.supabase
    .from("ai_optimization_proposals")
    .select("*")
    .eq("organization_id", ctx.organizationId)
    .eq("idempotency_key", key)
    .maybeSingle();
  return data ? mapRow(data as ProposalRow) : null;
}

export async function submitOptimizationForReview(
  ctx: AssistantContext,
  proposalId: string
): Promise<OptimizationProposalRecord> {
  const proposal = await getOptimizationProposal(ctx, proposalId);
  if (!proposal) throw new OptimizationValidationError("Proposal not found.");
  if (proposal.status !== "draft") {
    throw new OptimizationValidationError("Only draft proposals can be submitted for review.");
  }
  if (new Date(proposal.expiresAt).getTime() < Date.now()) {
    throw new OptimizationValidationError("Proposal expired. Regenerate required.");
  }

  const audit = appendAudit(proposal.auditLog, {
    at: new Date().toISOString(),
    actorId: ctx.user.id,
    previousStatus: proposal.status,
    newStatus: "review",
    reason: "Submitted for human review.",
    workspaceId: ctx.clientWorkspaceId,
  });

  const { data, error } = await ctx.supabase
    .from("ai_optimization_proposals")
    .update({
      status: "review",
      audit_log_json: audit,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposalId)
    .eq("organization_id", ctx.organizationId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as ProposalRow);
}

export async function approveOptimizationProposal(
  ctx: AssistantContext,
  proposalId: string,
  input?: { confirmHighRisk?: boolean }
): Promise<OptimizationProposalRecord> {
  const proposal = await getOptimizationProposal(ctx, proposalId);
  if (!proposal) throw new OptimizationValidationError("Proposal not found.");
  if (proposal.status !== "review") {
    throw new OptimizationValidationError("Proposal must be in review to approve.");
  }
  if (new Date(proposal.expiresAt).getTime() < Date.now()) {
    await ctx.supabase
      .from("ai_optimization_proposals")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", proposalId);
    throw new OptimizationValidationError("Proposal expired.");
  }

  const freshness = await verifyProposalFreshness(ctx, proposal);
  if (freshness.stale) {
    const audit = appendAudit(proposal.auditLog, {
      at: new Date().toISOString(),
      actorId: ctx.user.id,
      previousStatus: proposal.status,
      newStatus: "review",
      reason: `Stale state blocked approval: ${freshness.reasons[0]}`,
      workspaceId: ctx.clientWorkspaceId,
    });
    await ctx.supabase
      .from("ai_optimization_proposals")
      .update({
        status: "review",
        eligibility_json: {
          ...proposal.eligibility,
          status: "stale_evidence",
          reasons: freshness.reasons,
        },
        audit_log_json: audit,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposalId);
    throw new OptimizationValidationError("Proposal is stale. Regenerate required.");
  }

  const eligibility = await evaluateOptimizationEligibility(ctx, {
    proposalType: proposal.proposalType,
    sourceType: proposal.sourceType,
    sourceId: proposal.sourceId,
    currentState: proposal.currentState,
  });
  if (eligibility.status !== "eligible") {
    throw new OptimizationValidationError(`Not eligible: ${eligibility.status}`);
  }

  const risk = assessOptimizationRisk({
    eligibility,
    simulation: proposal.simulation,
    proposalType: proposal.proposalType,
    platform: (proposal.evidence.platform as string) ?? null,
  });
  if (risk.level === "blocked") {
    throw new OptimizationValidationError("Proposal is blocked and cannot be approved.");
  }
  if (risk.requiresExtraConfirmation && !input?.confirmHighRisk) {
    throw new OptimizationValidationError(
      "High-risk proposal requires explicit confirmHighRisk confirmation."
    );
  }

  const rollback: RollbackMetadata = {
    previousState: proposal.currentState,
    proposedState: proposal.proposedState,
    affectedResources: proposal.simulation.affectedResources.map((r) => ({
      type: r.type,
      id: r.id,
    })),
    capturedAt: new Date().toISOString(),
    actorId: ctx.user.id,
    sourceProposalId: proposal.id,
  };

  const audit = appendAudit(proposal.auditLog, {
    at: new Date().toISOString(),
    actorId: ctx.user.id,
    previousStatus: proposal.status,
    newStatus: "approved",
    reason: "Human approval recorded. Execution requires explicit confirmation.",
    sourceEvidence: eligibility.supportingEvidence,
    workspaceId: ctx.clientWorkspaceId,
  });

  const { data, error } = await ctx.supabase
    .from("ai_optimization_proposals")
    .update({
      status: "approved",
      approved_by: ctx.user.id,
      approved_at: new Date().toISOString(),
      eligibility_json: eligibility,
      risk_json: risk,
      rollback_state_json: rollback,
      audit_log_json: audit,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposalId)
    .eq("organization_id", ctx.organizationId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as ProposalRow);
}

export async function expireOptimizationProposals(ctx: AssistantContext): Promise<number> {
  const now = new Date().toISOString();
  type ExpireRow = { id: string; audit_log_json: unknown; status: string };
  const workspaceId = ctx.scope.isAgency
    ? ctx.scope.clientWorkspaceId ?? "00000000-0000-0000-0000-000000000000"
    : null;
  let expireQuery = ctx.supabase
    .from("ai_optimization_proposals")
    .select("id, audit_log_json, status")
    .eq("organization_id", ctx.organizationId)
    .in("status", ["draft", "review"])
    .lt("expires_at", now);
  expireQuery =
    workspaceId === null
      ? expireQuery.is("client_workspace_id", null)
      : expireQuery.eq("client_workspace_id", workspaceId);
  const { data: rows } = await expireQuery;
  let count = 0;
  for (const row of rows ?? []) {
    const log = Array.isArray(row.audit_log_json)
      ? (row.audit_log_json as OptimizationAuditEntry[])
      : [];
    await ctx.supabase
      .from("ai_optimization_proposals")
      .update({
        status: "expired",
        audit_log_json: appendAudit(log, {
          at: now,
          actorId: "system",
          previousStatus: row.status as OptimizationProposalStatus,
          newStatus: "expired",
          reason: "TTL expired.",
          workspaceId: ctx.clientWorkspaceId,
        }),
        updated_at: now,
      })
      .eq("id", row.id);
    count += 1;
  }
  return count;
}

export async function previewOptimizationProposal(
  ctx: AssistantContext,
  proposalId: string
): Promise<SimulationPreview | null> {
  const proposal = await getOptimizationProposal(ctx, proposalId);
  return proposal?.simulation ?? null;
}
