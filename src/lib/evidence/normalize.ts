import type { ExperimentEvaluationDocument } from "@/lib/evaluation/experiment";
import { hasUsableMeasurementSnapshot } from "@/lib/evaluation/experiment";
import type { ExperimentRecord, ExperimentVariantRecord } from "@/lib/experiments/types";
import type { EvidenceRecord } from "./types";

function contentTypesFromExperiment(exp: ExperimentRecord): string | null {
  const ctx = exp.contentContext;
  const types = ctx?.contentTypes;
  if (Array.isArray(types) && types.length) return types.map(String).join(",");
  return null;
}

export function evidenceRecordFromExperiment(
  exp: ExperimentRecord,
  workspaceId: string | null
): EvidenceRecord[] {
  const records: EvidenceRecord[] = [];
  const snap = hasUsableMeasurementSnapshot(exp.measurementSnapshot)
    ? exp.measurementSnapshot
    : null;
  const evalDoc = exp.experimentEvaluation as ExperimentEvaluationDocument | undefined;
  const normalized = evalDoc?.normalized;
  const cmp = snap?.comparison ?? exp.allocation.lastComparison ?? null;

  records.push({
    sourceType: "experiment",
    sourceId: exp.id,
    workspaceId,
    experimentId: exp.id,
    experimentVariantId: null,
    evaluationId: evalDoc?.strategyEvaluationId ?? null,
    learningOutcomeId: null,
    strategicPlanId: exp.strategicPlanId,
    contentId: null,
    campaignId: null,
    platform: exp.platform,
    metric: exp.successMetric,
    objective: exp.objective,
    contentType: contentTypesFromExperiment(exp),
    audienceContext: exp.audienceContext ?? null,
    observedResult: cmp?.higherObservedVariantKey
      ? `higher observed ${exp.successMetric} for variant ${cmp.higherObservedVariantKey}`
      : null,
    higherObservedVariantKey: cmp?.higherObservedVariantKey ?? null,
    evidenceQuality: normalized?.dataQualityStatus ?? exp.evidenceQuality,
    attributionStatus: normalized?.attributionStatus ?? snap?.attribution.status ?? null,
    observationWindowDays: exp.minimumObservationDays,
    limitations: normalized?.limitations ?? snap?.limitations.slice(0, 4) ?? [],
    createdAt: exp.endedAt ?? exp.updatedAt,
  });

  for (const v of exp.variants ?? []) {
    records.push(evidenceRecordFromVariant(exp, v, workspaceId));
  }

  return records;
}

export function evidenceRecordFromVariant(
  exp: ExperimentRecord,
  variant: ExperimentVariantRecord,
  workspaceId: string | null
): EvidenceRecord {
  return {
    sourceType: "experiment_variant",
    sourceId: variant.id,
    workspaceId,
    experimentId: exp.id,
    experimentVariantId: variant.id,
    evaluationId: null,
    learningOutcomeId: null,
    strategicPlanId: exp.strategicPlanId,
    contentId: variant.contentId,
    campaignId: variant.campaignId,
    platform: exp.platform,
    metric: exp.successMetric,
    objective: exp.objective,
    contentType: null,
    audienceContext: exp.audienceContext ?? null,
    observedResult: null,
    higherObservedVariantKey: null,
    evidenceQuality: null,
    attributionStatus: null,
    observationWindowDays: exp.minimumObservationDays,
    limitations: [],
    createdAt: variant.updatedAt,
  };
}

export function parseExperimentIdFromLearningKey(key: string): {
  experimentId: string | null;
  variantId: string | null;
} {
  const m = /^experiment:([^:]+):variant:(.+)$/.exec(key);
  if (!m) return { experimentId: null, variantId: null };
  return { experimentId: m[1], variantId: m[2] };
}
