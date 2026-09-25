import { ensureOperationalScope } from "../permissions";
import { isValidUuid } from "../resource-scope";
import type { AssistantContext } from "../types";
import { getEvidenceConflicts } from "@/lib/evidence/conflicts";
import { getEvidenceGraph, getEvidenceRelationships } from "@/lib/evidence/graph";
import { getCrossExperimentLearnings } from "@/lib/evidence/learnings";
import { buildDeterministicCrossExperimentSummary } from "@/lib/evidence/openai";
import { getCrossExperimentEvidence } from "@/lib/evidence/patterns";

export async function getCrossExperimentEvidenceTool(
  ctx: AssistantContext,
  args: { platform?: string; metric?: string; objectiveContains?: string; limit?: number }
) {
  ensureOperationalScope(ctx.scope);
  const evidence = await getCrossExperimentEvidence(ctx, args);
  const interpretation = buildDeterministicCrossExperimentSummary(evidence);
  return {
    evidence,
    interpretation,
    framing:
      "Use MEASURED/OBSERVED/INTERPRETED/UNCERTAIN labels. Never declare a universal winner.",
  };
}

export async function getCrossExperimentLearningsTool(
  ctx: AssistantContext,
  args: { experimentId?: string; limit?: number }
) {
  ensureOperationalScope(ctx.scope);
  if (args.experimentId && !isValidUuid(args.experimentId)) {
    return { error: "Invalid experimentId." };
  }
  const learnings = await getCrossExperimentLearnings(ctx, args);
  return { learnings };
}

export async function getEvidenceRelationshipsTool(
  ctx: AssistantContext,
  args: { experimentId?: string }
) {
  ensureOperationalScope(ctx.scope);
  if (!args.experimentId || !isValidUuid(args.experimentId)) {
    return { error: "experimentId is required." };
  }
  const relationships = await getEvidenceRelationships(ctx, args.experimentId);
  const graph = await getEvidenceGraph(ctx, { limit: 5 });
  return {
    relationships,
    recordCount: graph.records.length,
    traceability: graph.records
      .filter((r) => r.experimentId === args.experimentId)
      .slice(0, 10)
      .map((r) => ({
        sourceType: r.sourceType,
        sourceId: r.sourceId,
        experimentId: r.experimentId,
        learningOutcomeId: r.learningOutcomeId,
        evaluationId: r.evaluationId,
      })),
  };
}

export async function getEvidenceConflictsTool(
  ctx: AssistantContext,
  args: { experimentId?: string }
) {
  ensureOperationalScope(ctx.scope);
  if (args.experimentId && !isValidUuid(args.experimentId)) {
    return { error: "Invalid experimentId." };
  }
  const conflicts = await getEvidenceConflicts(ctx, args.experimentId);
  return { conflicts };
}
