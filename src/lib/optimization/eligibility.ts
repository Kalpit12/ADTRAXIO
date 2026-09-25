import type { AssistantContext } from "@/lib/assistant/types";
import { getCrossExperimentEvidence } from "@/lib/evidence/patterns";
import { getEvidenceConflicts } from "@/lib/evidence/conflicts";
import { getExperiment } from "@/lib/experiments/service";
import type {
  EligibilityReport,
  EligibilityStatus,
  OptimizationProposalType,
} from "./types";
import type { ExperimentRecord } from "@/lib/experiments/types";
import {
  MAX_EVIDENCE_AGE_DAYS,
  MIN_COMPLETED_EXPERIMENTS_FOR_ALLOCATION,
  MIN_MEASURED_OBSERVATIONS,
  SUPPORTED_PROPOSAL_TYPES,
  USABLE_EVIDENCE_QUALITIES,
} from "./constants";

async function evaluateRunningAllocationEligibility(
  ctx: AssistantContext,
  sourceId: string,
  exp: ExperimentRecord
): Promise<EligibilityReport> {
  const reasons: string[] = [];
  const supportingEvidence: string[] = [
    "Experiment is running; allocation change is scoped to variant split only.",
  ];
  const limitations = [
    "Eligibility is deterministic and does not imply causation or statistical significance.",
    "Running-experiment allocation changes are operational; performance outcome is measured separately.",
  ];

  if ((exp.variants ?? []).length < 2) {
    reasons.push("At least two variants are required.");
  }

  const cross = await getCrossExperimentEvidence(ctx, { limit: 20 });
  if (cross.sampleCount < MIN_COMPLETED_EXPERIMENTS_FOR_ALLOCATION) {
    reasons.push(
      `Fewer than ${MIN_COMPLETED_EXPERIMENTS_FOR_ALLOCATION} comparable completed experiments.`
    );
  } else {
    supportingEvidence.push(cross.summary);
  }
  if (cross.classification === "mixed_observed_pattern") {
    return {
      status: "conflicting_evidence",
      reasons: ["Cross-experiment evidence is mixed.", ...reasons],
      supportingEvidence,
      limitations: [...limitations, ...cross.limitations],
      evaluatedAt: new Date().toISOString(),
    };
  }
  const conflicts = await getEvidenceConflicts(ctx, sourceId);
  if (conflicts.length) {
    return {
      status: "conflicting_evidence",
      reasons: [conflicts[0].differences[0] ?? "Conflicting experiment evidence.", ...reasons],
      supportingEvidence,
      limitations: [...limitations, ...conflicts[0].limitations],
      evaluatedAt: new Date().toISOString(),
    };
  }

  const status: EligibilityStatus = reasons.length ? "insufficient_evidence" : "eligible";
  return {
    status,
    reasons,
    supportingEvidence,
    limitations,
    evaluatedAt: new Date().toISOString(),
  };
}

export async function evaluateOptimizationEligibility(
  ctx: AssistantContext,
  input: {
    proposalType: OptimizationProposalType;
    sourceType: string;
    sourceId: string;
    currentState: Record<string, unknown>;
  }
): Promise<EligibilityReport> {
  const reasons: string[] = [];
  const supportingEvidence: string[] = [];
  const limitations = [
    "Eligibility is deterministic and does not imply causation or statistical significance.",
  ];

  if (!SUPPORTED_PROPOSAL_TYPES.includes(input.proposalType)) {
    return {
      status: "unsupported_change",
      reasons: ["Proposal type is not supported."],
      supportingEvidence: [],
      limitations,
      evaluatedAt: new Date().toISOString(),
    };
  }

  if (input.sourceType === "experiment") {
    const exp = await getExperiment(ctx, input.sourceId);
    if (
      exp &&
      input.proposalType === "allocation_change" &&
      exp.status === "running"
    ) {
      return evaluateRunningAllocationEligibility(ctx, input.sourceId, exp);
    }
    if (!exp) {
      return {
        status: "stale_evidence",
        reasons: ["Source experiment no longer exists."],
        supportingEvidence: [],
        limitations,
        evaluatedAt: new Date().toISOString(),
      };
    }
    if (exp.status !== "completed") {
      reasons.push("Experiment is not completed.");
    }
    if (!exp.successMetric) {
      return {
        status: "missing_metric",
        reasons: ["Primary success metric is missing."],
        supportingEvidence: [],
        limitations,
        evaluatedAt: new Date().toISOString(),
      };
    }
    const variants = exp.variants ?? [];
    const measured = variants.filter((v) => v.outcome?.engagement != null || v.outcome?.impressions != null);
    if (measured.length < MIN_MEASURED_OBSERVATIONS) {
      reasons.push("Insufficient measured variant outcomes.");
    } else {
      supportingEvidence.push(`${measured.length} variant(s) with measured outcomes.`);
    }
    const dq =
      exp.experimentEvaluation?.normalized?.dataQualityStatus ??
      exp.evidenceQuality ??
      "unknown";
    if (!USABLE_EVIDENCE_QUALITIES.has(String(dq))) {
      reasons.push(`Evidence quality not sufficient (${dq}).`);
    } else {
      supportingEvidence.push(`Evidence quality: ${dq}.`);
    }
    if (exp.endedAt) {
      const ageDays = (Date.now() - new Date(exp.endedAt).getTime()) / (24 * 60 * 60 * 1000);
      if (ageDays > MAX_EVIDENCE_AGE_DAYS) {
        return {
          status: "stale_evidence",
          reasons: ["Experiment evidence exceeds maximum age threshold."],
          supportingEvidence,
          limitations,
          evaluatedAt: new Date().toISOString(),
        };
      }
    }
    const baselineMissing = variants.some((v) => !v.baseline);
    if (baselineMissing) reasons.push("Missing baseline on one or more variants.");
  }

  if (input.proposalType === "allocation_change") {
    const cross = await getCrossExperimentEvidence(ctx, { limit: 20 });
    if (cross.sampleCount < MIN_COMPLETED_EXPERIMENTS_FOR_ALLOCATION) {
      reasons.push(
        `Fewer than ${MIN_COMPLETED_EXPERIMENTS_FOR_ALLOCATION} comparable completed experiments.`
      );
    } else {
      supportingEvidence.push(cross.summary);
    }
    if (cross.classification === "mixed_observed_pattern") {
      return {
        status: "conflicting_evidence",
        reasons: ["Cross-experiment evidence is mixed.", ...reasons],
        supportingEvidence,
        limitations: [...limitations, ...cross.limitations],
        evaluatedAt: new Date().toISOString(),
      };
    }
    const conflicts = await getEvidenceConflicts(ctx, input.sourceId);
    if (conflicts.length) {
      return {
        status: "conflicting_evidence",
        reasons: [conflicts[0].differences[0] ?? "Conflicting experiment evidence.", ...reasons],
        supportingEvidence,
        limitations: [...limitations, ...conflicts[0].limitations],
        evaluatedAt: new Date().toISOString(),
      };
    }
  }

  let status: EligibilityStatus = "eligible";
  if (reasons.some((r) => r.includes("Missing baseline"))) status = "missing_baseline";
  else if (reasons.some((r) => r.includes("Insufficient"))) status = "insufficient_evidence";
  else if (reasons.length) status = "insufficient_evidence";

  if (status === "eligible" && supportingEvidence.length === 0) {
    status = "insufficient_evidence";
    reasons.push("No supporting evidence references were produced.");
  }

  return {
    status,
    reasons,
    supportingEvidence,
    limitations,
    evaluatedAt: new Date().toISOString(),
  };
}
