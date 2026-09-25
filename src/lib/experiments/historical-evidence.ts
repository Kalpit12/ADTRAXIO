import type { AssistantContext } from "@/lib/assistant/types";
import type { HistoricalExperimentEvidence } from "./types";
import { listExperiments } from "./service";

export async function getHistoricalExperimentEvidence(
  ctx: AssistantContext,
  filters?: {
    platform?: string;
    metric?: string;
    objectiveContains?: string;
    limit?: number;
  }
): Promise<HistoricalExperimentEvidence> {
  let experiments = await listExperiments(ctx, {
    limit: filters?.limit ?? 30,
    status: "completed",
  });

  if (filters?.platform) {
    experiments = experiments.filter((e) => e.platform === filters.platform);
  }
  if (filters?.metric) {
    experiments = experiments.filter((e) => e.successMetric === filters.metric);
  }
  if (filters?.objectiveContains) {
    const q = filters.objectiveContains.toLowerCase();
    experiments = experiments.filter((e) => e.objective.toLowerCase().includes(q));
  }

  const groups = new Map<string, { ids: string[]; pattern: string }>();

  for (const e of experiments) {
    const cmp = e.allocation.lastComparison;
    const key = cmp?.higherObservedVariantKey ?? "unclear";
    const label = `${e.successMetric}:${key}`;
    const g = groups.get(label) ?? { ids: [], pattern: `higher observed ${e.successMetric} for variant ${key}` };
    g.ids.push(e.id);
    groups.set(label, g);
  }

  const groupList = [...groups.entries()].map(([label, g]) => ({
    label,
    experimentIds: g.ids,
    observedPattern: g.pattern,
  }));

  const mixed = groupList.length > 1;

  let summary = `${experiments.length} completed experiment(s) in scope.`;
  if (!experiments.length) {
    summary = "No completed experiments match the filters.";
  } else if (mixed) {
    summary = "Observed results are mixed across comparable experiments.";
  } else if (groupList[0]) {
    summary = `${groupList[0].experimentIds.length} experiment(s) share a similar observed pattern (${groupList[0].observedPattern}).`;
  }

  return {
    summary,
    totalCompleted: experiments.length,
    groups: groupList,
    mixed,
    limitations: [
      "Historical aggregation describes observed patterns, not universal rules.",
      "Do not treat any single experiment as a winner.",
    ],
  };
}
