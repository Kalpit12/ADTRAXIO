import type { AssistantContext } from "@/lib/assistant/types";
import type { ExperimentRecord } from "@/lib/experiments/types";
import type { LearningOutcomeRecord } from "@/lib/learning/types";
import { getExperiment } from "@/lib/experiments/service";
import { findRelatedExperiments } from "@/lib/experiments/relationships";
import { evidenceRecordFromExperiment, parseExperimentIdFromLearningKey } from "./normalize";
import { loadCompletedExperimentsForEvidence, loadExperimentLearnings } from "./load";
import type { EvidenceGraph, EvidenceRelationship } from "./types";

function workspaceId(ctx: AssistantContext): string | null {
  return ctx.clientWorkspaceId;
}

export function buildEvidenceGraphFromExperiments(
  ctx: AssistantContext,
  experiments: ExperimentRecord[],
  learnings: LearningOutcomeRecord[]
): EvidenceGraph {
  const records = experiments.flatMap((e) =>
    evidenceRecordFromExperiment(e, workspaceId(ctx))
  );

  const relationships: EvidenceRelationship[] = [];

  for (const exp of experiments) {
    for (const v of exp.variants ?? []) {
      relationships.push({
        type: "tests",
        from: { type: "experiment", id: exp.id },
        to: { type: "experiment_variant", id: v.id },
        label: `Variant ${v.variantKey}`,
      });
      if (v.contentId) {
        relationships.push({
          type: "uses",
          from: { type: "experiment_variant", id: v.id },
          to: { type: "content", id: v.contentId },
          label: "uses content",
        });
      }
      if (v.campaignId) {
        relationships.push({
          type: "uses",
          from: { type: "experiment_variant", id: v.id },
          to: { type: "campaign", id: v.campaignId },
          label: "uses campaign",
        });
      }
    }
    if (exp.successMetric) {
      relationships.push({
        type: "measures",
        from: { type: "experiment", id: exp.id },
        to: { type: "platform", id: exp.platform ?? "unknown" },
        label: `measures ${exp.successMetric}`,
      });
    }
    const evalDoc = exp.experimentEvaluation;
    const evalId =
      evalDoc && "strategyEvaluationId" in evalDoc
        ? evalDoc.strategyEvaluationId ?? null
        : null;
    if (evalId) {
      relationships.push({
        type: "produces",
        from: { type: "experiment", id: exp.id },
        to: { type: "experiment_evaluation", id: evalId },
        label: "produces evaluation",
      });
    }
    if (exp.strategicPlanId) {
      relationships.push({
        type: "informs",
        from: { type: "experiment", id: exp.id },
        to: { type: "strategic_plan", id: exp.strategicPlanId },
        label: "informs strategic plan",
      });
    }
  }

  for (const lo of learnings) {
    const parsed = parseExperimentIdFromLearningKey(lo.idempotencyKey);
    if (!parsed.experimentId) continue;
    relationships.push({
      type: "produces",
      from: { type: "experiment", id: parsed.experimentId },
      to: { type: "learning_outcome", id: lo.id },
      label: "produces learning",
    });
    if (lo.strategicPlanId) {
      relationships.push({
        type: "informs",
        from: { type: "learning_outcome", id: lo.id },
        to: { type: "strategic_plan", id: lo.strategicPlanId },
        label: "informs strategic plan",
      });
    }
  }

  return {
    records,
    relationships,
    limitations: [
      "Evidence graph is derived from workspace-scoped experiment and learning records only.",
      "Relationships do not imply causation.",
    ],
  };
}

export async function getEvidenceGraph(
  ctx: AssistantContext,
  filters?: { platform?: string; metric?: string; limit?: number }
): Promise<EvidenceGraph> {
  const experiments = await loadCompletedExperimentsForEvidence(ctx, filters);
  const learnings = await loadExperimentLearnings(ctx);
  return buildEvidenceGraphFromExperiments(ctx, experiments, learnings);
}

export async function getEvidenceRelationships(
  ctx: AssistantContext,
  experimentId: string
): Promise<EvidenceRelationship[]> {
  const exp = await getExperiment(ctx, experimentId);
  if (!exp) return [];
  const learnings = await loadExperimentLearnings(ctx, 60);
  const graph = buildEvidenceGraphFromExperiments(ctx, [exp], learnings);
  const related = await findRelatedExperiments(ctx, exp);
  const relEdges: EvidenceRelationship[] = related.map((r) => ({
    type: "related_to",
    from: { type: "experiment", id: exp.id },
    to: { type: "experiment", id: r.experimentId },
    label: r.reason,
  }));
  return [...graph.relationships, ...relEdges];
}
