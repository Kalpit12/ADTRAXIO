import type { AssistantContext } from "@/lib/assistant/types";
import { listExperiments, getExperiment } from "@/lib/experiments/service";
import { listLearningOutcomes } from "@/lib/learning/service";
import type { ExperimentRecord } from "@/lib/experiments/types";
import type { LearningOutcomeRecord } from "@/lib/learning/types";

export const MAX_EVIDENCE_EXPERIMENTS = 24;
export const EXPERIMENT_LOAD_CONCURRENCY = 6;

export async function loadCompletedExperimentsForEvidence(
  ctx: AssistantContext,
  options?: { limit?: number; platform?: string; metric?: string }
): Promise<ExperimentRecord[]> {
  const limit = Math.min(options?.limit ?? MAX_EVIDENCE_EXPERIMENTS, MAX_EVIDENCE_EXPERIMENTS);
  let items = await listExperiments(ctx, { limit: limit * 2, status: "completed" });
  if (options?.platform) {
    items = items.filter((e) => e.platform === options.platform);
  }
  if (options?.metric) {
    items = items.filter((e) => e.successMetric === options.metric);
  }
  items = items.slice(0, limit);

  const loaded: ExperimentRecord[] = [];
  for (let i = 0; i < items.length; i += EXPERIMENT_LOAD_CONCURRENCY) {
    const batch = items.slice(i, i + EXPERIMENT_LOAD_CONCURRENCY);
    const full = await Promise.all(batch.map((e) => getExperiment(ctx, e.id)));
    for (const exp of full) {
      if (exp) loaded.push(exp);
    }
  }
  return loaded;
}

export async function loadExperimentLearnings(
  ctx: AssistantContext,
  limit = 40
): Promise<LearningOutcomeRecord[]> {
  const outcomes = await listLearningOutcomes(ctx, { limit });
  return outcomes.filter((o) => o.idempotencyKey.startsWith("experiment:"));
}
