import { ensureOperationalScope } from "../permissions";
import { isValidUuid } from "../resource-scope";
import type { AssistantContext } from "../types";
import { experimentReviewUrl } from "@/lib/experiments/context";
import {
  getExperimentConflicts,
  getExperimentIntelligence,
  getRelatedExperiments,
  listExperimentHistory,
} from "@/lib/experiments/intelligence";
import { getHistoricalExperimentEvidence } from "@/lib/experiments/historical-evidence";
import { getExperimentEvaluationDocument } from "@/lib/evaluation/experiment-run";
import {
  createExperimentDraftWithAI,
  getExperiment,
  getExperimentComparison,
  listExperiments,
  prepareExperiment,
} from "@/lib/experiments/service";

export async function getExperimentsTool(
  ctx: AssistantContext,
  args: { limit?: number; status?: string }
) {
  ensureOperationalScope(ctx.scope);
  const experiments = await listExperiments(ctx, {
    limit: Math.min(args.limit ?? 10, 20),
    status: args.status as import("@/lib/experiments/types").ExperimentStatus | undefined,
  });
  return {
    experiments: experiments.map((e) => ({
      id: e.id,
      name: e.name,
      status: e.status,
      objective: e.objective,
      successMetric: e.successMetric,
      startedAt: e.startedAt,
      endedAt: e.endedAt,
    })),
  };
}

export async function getExperimentTool(
  ctx: AssistantContext,
  args: { experimentId?: string }
) {
  ensureOperationalScope(ctx.scope);
  if (!args.experimentId || !isValidUuid(args.experimentId)) {
    return { error: "experimentId is required." };
  }
  const experiment = await getExperiment(ctx, args.experimentId);
  if (!experiment) return { error: "Experiment not found." };
  return { experiment };
}

export async function compareExperimentVariantsTool(
  ctx: AssistantContext,
  args: { experimentId?: string }
) {
  ensureOperationalScope(ctx.scope);
  if (!args.experimentId || !isValidUuid(args.experimentId)) {
    return { error: "experimentId is required." };
  }
  const comparison = await getExperimentComparison(ctx, args.experimentId);
  return { comparison };
}

export async function createExperimentDraftTool(
  ctx: AssistantContext,
  args: { request?: string; platform?: string }
) {
  ensureOperationalScope(ctx.scope);
  const userRequest = args.request?.trim();
  if (!userRequest) return { error: "request is required." };
  try {
    const experiment = await createExperimentDraftWithAI(ctx, {
      userRequest,
      platform: args.platform ?? null,
    });
    return {
      experimentId: experiment.id,
      name: experiment.name,
      objective: experiment.objective,
      hypothesis: experiment.hypothesis,
      variantCount: experiment.variants?.length ?? 0,
      reviewUrl: experimentReviewUrl(experiment.id),
      message:
        "AI-suggested experiment draft created. Review variants, allocation, and metrics before approval. Nothing has been started or published.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create draft.";
    if (message.includes("limit") || message.includes("entitlement")) {
      return { error: message, blockedByBilling: true };
    }
    return { error: message };
  }
}

export async function getExperimentIntelligenceTool(
  ctx: AssistantContext,
  args: { experimentId?: string }
) {
  ensureOperationalScope(ctx.scope);
  if (!args.experimentId || !isValidUuid(args.experimentId)) {
    return { error: "experimentId is required." };
  }
  const intelligence = await getExperimentIntelligence(ctx, args.experimentId);
  if (!intelligence) return { error: "Experiment not found." };
  return { intelligence };
}

export async function getExperimentHistoryTool(
  ctx: AssistantContext,
  args: { limit?: number; search?: string; platform?: string; metric?: string }
) {
  ensureOperationalScope(ctx.scope);
  const history = await listExperimentHistory(ctx, {
    limit: Math.min(args.limit ?? 10, 20),
    search: args.search,
    platform: args.platform,
    metric: args.metric,
  });
  return { history };
}

export async function getRelatedExperimentsTool(
  ctx: AssistantContext,
  args: { experimentId?: string }
) {
  ensureOperationalScope(ctx.scope);
  if (!args.experimentId || !isValidUuid(args.experimentId)) {
    return { error: "experimentId is required." };
  }
  const related = await getRelatedExperiments(ctx, args.experimentId);
  return { related };
}

export async function getExperimentConflictsTool(
  ctx: AssistantContext,
  args: { experimentId?: string }
) {
  ensureOperationalScope(ctx.scope);
  if (!args.experimentId || !isValidUuid(args.experimentId)) {
    return { error: "experimentId is required." };
  }
  const conflicts = await getExperimentConflicts(ctx, args.experimentId);
  return { conflicts };
}

export async function getExperimentEvaluationTool(
  ctx: AssistantContext,
  args: { experimentId?: string }
) {
  ensureOperationalScope(ctx.scope);
  if (!args.experimentId || !isValidUuid(args.experimentId)) {
    return { error: "experimentId is required." };
  }
  const evaluation = await getExperimentEvaluationDocument(ctx, args.experimentId);
  if (!evaluation?.normalized) {
    return {
      evaluation: null,
      message: "UNCERTAIN: No normalized experiment evaluation yet.",
    };
  }
  return {
    evaluation,
    framing:
      "Use MEASURED for values, OBSERVED for comparisons, INTERPRETED for explanations, UNCERTAIN when data is incomplete. Never declare a winner.",
  };
}

export async function getHistoricalExperimentEvidenceTool(
  ctx: AssistantContext,
  args: { platform?: string; metric?: string; objectiveContains?: string; limit?: number }
) {
  ensureOperationalScope(ctx.scope);
  const evidence = await getHistoricalExperimentEvidence(ctx, {
    platform: args.platform,
    metric: args.metric,
    objectiveContains: args.objectiveContains,
    limit: args.limit,
  });
  return {
    evidence,
    framing:
      "Report MEASURED values, OBSERVED comparisons, INTERPRETED patterns, and UNCERTAIN gaps. Never declare a universal winner.",
  };
}

export async function prepareExperimentTool(
  ctx: AssistantContext,
  args: { experimentId?: string }
) {
  ensureOperationalScope(ctx.scope);
  if (!args.experimentId || !isValidUuid(args.experimentId)) {
    return { error: "experimentId is required." };
  }
  try {
    const result = await prepareExperiment(ctx, args.experimentId);
    return {
      experimentId: result.experiment.id,
      executionPlanId: result.executionPlanId,
      reviewUrl: `/assistant/execution/${result.executionPlanId}`,
      message:
        "Execution plan prepared for experiment variants. Approve and execute steps manually — experiment does not start automatically.",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to prepare experiment.",
    };
  }
}
