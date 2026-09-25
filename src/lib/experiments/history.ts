import type { AssistantContext } from "@/lib/assistant/types";
import type { EvidenceQualityLevel, ExperimentHistoryItem, ExperimentStatus } from "./types";
import { listExperiments } from "./service";

export async function queryExperimentHistory(
  ctx: AssistantContext,
  options?: {
    limit?: number;
    status?: ExperimentStatus;
    platform?: string;
    metric?: string;
    objectiveContains?: string;
    search?: string;
  }
): Promise<ExperimentHistoryItem[]> {
  const experiments = await listExperiments(ctx, {
    limit: options?.limit ?? 40,
    status: "completed",
  });

  let items = experiments.map((e) => {
    const comparison = e.allocation.lastComparison;
    const higher = comparison?.higherObservedVariantKey;
    return {
      id: e.id,
      name: e.name,
      objective: e.objective,
      primaryMetric: e.successMetric,
      platform: e.platform,
      status: e.status,
      evidenceQuality: e.evidenceQuality,
      observedSummary: higher
        ? `Variant ${higher} had higher observed ${e.successMetric}`
        : null,
      endedAt: e.endedAt,
      createdAt: e.createdAt,
    };
  });

  if (options?.platform) {
    items = items.filter((i) => i.platform === options.platform);
  }
  if (options?.metric) {
    items = items.filter((i) => i.primaryMetric === options.metric);
  }
  if (options?.objectiveContains) {
    const q = options.objectiveContains.toLowerCase();
    items = items.filter((i) => i.objective.toLowerCase().includes(q));
  }
  if (options?.search) {
    const q = options.search.toLowerCase();
    items = items.filter(
      (i) => i.name.toLowerCase().includes(q) || i.objective.toLowerCase().includes(q)
    );
  }

  return items.map((i) => ({
    ...i,
    evidenceQuality: i.evidenceQuality as EvidenceQualityLevel | null,
  }));
}
