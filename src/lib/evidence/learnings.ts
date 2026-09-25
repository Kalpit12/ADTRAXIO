import type { AssistantContext } from "@/lib/assistant/types";
import { getExperiment } from "@/lib/experiments/service";
import { hasUsableMeasurementSnapshot } from "@/lib/evaluation/experiment";
import { loadCompletedExperimentsForEvidence, loadExperimentLearnings } from "./load";
import { parseExperimentIdFromLearningKey } from "./normalize";
import type { CrossExperimentLearningsResult, CrossExperimentLearningLink } from "./types";

export async function getCrossExperimentLearnings(
  ctx: AssistantContext,
  options?: { experimentId?: string; limit?: number }
): Promise<CrossExperimentLearningsResult> {
  const learnings = await loadExperimentLearnings(ctx, options?.limit ?? 40);
  const experiments = await loadCompletedExperimentsForEvidence(ctx, { limit: 24 });
  const expById = new Map(experiments.map((e) => [e.id, e]));

  const links: CrossExperimentLearningLink[] = [];

  for (const lo of learnings) {
    const { experimentId, variantId } = parseExperimentIdFromLearningKey(lo.idempotencyKey);
    if (!experimentId) continue;
    if (options?.experimentId && experimentId !== options.experimentId) continue;

    let exp = expById.get(experimentId) ?? undefined;
    if (!exp) {
      const loaded = await getExperiment(ctx, experimentId);
      if (loaded) {
        exp = loaded;
        expById.set(experimentId, loaded);
      }
    }
    const snap = exp && hasUsableMeasurementSnapshot(exp.measurementSnapshot)
      ? exp.measurementSnapshot
      : null;
    const normalized = exp?.experimentEvaluation?.normalized;

    links.push({
      learningOutcomeId: lo.id,
      experimentId,
      experimentVariantId: variantId,
      metric: exp?.successMetric ?? null,
      objective: lo.objective,
      platform: lo.platform ?? exp?.platform ?? null,
      status: lo.status,
      evidenceQuality: normalized?.dataQualityStatus ?? exp?.evidenceQuality ?? null,
      attributionStatus: normalized?.attributionStatus ?? snap?.attribution.status ?? null,
      observationWindowDays: exp?.minimumObservationDays ?? lo.baseline.windowDays,
      limitations: [
        ...(normalized?.limitations.slice(0, 2) ?? []),
        "Learning is linked to experiment variant measurement — not causal proof.",
      ],
      strategicPlanId: lo.strategicPlanId ?? exp?.strategicPlanId ?? null,
    });
  }

  let summary = `${links.length} learning outcome(s) linked to experiments.`;
  if (!links.length) {
    summary = "No experiment-linked learning outcomes in this workspace.";
  }

  return {
    summary,
    links,
    limitations: [
      "VALIDATED LEARNING is separate from CURRENT PERFORMANCE and EXPERIMENT EVIDENCE.",
      "Do not flatten historical evidence into a generic recommendation.",
    ],
  };
}
