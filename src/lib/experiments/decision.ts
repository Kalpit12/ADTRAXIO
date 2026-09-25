import type { AssistantContext } from "@/lib/assistant/types";
import { getExperiment } from "./service";
import type { ExperimentConflictFinding, RelatedExperimentRef } from "./types";

export async function detectExperimentConflicts(
  ctx: AssistantContext,
  related: RelatedExperimentRef[]
): Promise<ExperimentConflictFinding[]> {
  const byMetric = new Map<string, RelatedExperimentRef[]>();
  for (const r of related) {
    const key = `${r.platform ?? "any"}:${r.successMetric}`;
    const list = byMetric.get(key) ?? [];
    list.push(r);
    byMetric.set(key, list);
  }

  const findings: ExperimentConflictFinding[] = [];

  for (const [key, group] of byMetric) {
    if (group.length < 2) continue;
    const experiments: ExperimentConflictFinding["experiments"] = [];
    const observed: Array<{ id: string; higherKey: string | null; name: string }> = [];
    const platforms = new Set<string>();
    const objectives = new Set<string>();

    for (const ref of group) {
      const exp = await getExperiment(ctx, ref.experimentId);
      if (!exp || exp.status !== "completed") continue;
      const cmp = exp.allocation.lastComparison;
      const higherKey = cmp?.higherObservedVariantKey ?? null;
      observed.push({
        id: ref.experimentId,
        higherKey,
        name: ref.name,
      });
      experiments.push({
        id: ref.experimentId,
        name: ref.name,
        higherObservedVariantKey: higherKey,
      });
      if (exp.platform) platforms.add(exp.platform);
      objectives.add(exp.objective);
    }

    const keys = new Set(observed.map((o) => o.higherKey).filter(Boolean) as string[]);
    if (keys.size > 1) {
      const commonContext = [
        `Shared metric context: ${key}`,
        platforms.size === 1 ? `Platform: ${[...platforms][0]}` : null,
      ].filter(Boolean) as string[];

      const differingContext: string[] = [];
      if (platforms.size > 1) differingContext.push("Different platforms across experiments.");
      if (objectives.size > 1) differingContext.push("Different stated objectives.");

      findings.push({
        topic: key,
        summary: "Historical experiments show mixed observed results.",
        experimentIds: observed.map((o) => o.id),
        conflict: true,
        experiments,
        commonContext,
        differingContext,
        explanation:
          "Comparable experiments with the same primary metric show different higher-observed variant keys. Observed results are mixed.",
        limitations: [
          "Different observation windows, platforms, or content may explain differences.",
          "Do not treat any single experiment as a universal rule.",
          "The system does not resolve this conflict automatically.",
        ],
      });
    }
  }

  return findings;
}
