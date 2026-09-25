import type { AssistantContext } from "@/lib/assistant/types";
import type { ExperimentRecord } from "@/lib/experiments/types";
import { getExperiment } from "@/lib/experiments/service";
import { findRelatedExperiments } from "@/lib/experiments/relationships";
import { loadCompletedExperimentsForEvidence } from "./load";
import type { EvidenceConflictDetail } from "./types";

export async function getEvidenceConflicts(
  ctx: AssistantContext,
  experimentId?: string
): Promise<EvidenceConflictDetail[]> {
  const experiments = experimentId
    ? [await getExperiment(ctx, experimentId)].filter(Boolean)
    : await loadCompletedExperimentsForEvidence(ctx, { limit: 20 });

  const findings: EvidenceConflictDetail[] = [];
  const anchor = experiments[0];
  if (experimentId && !anchor) return [];

  const scope = experimentId && anchor
    ? await findRelatedExperiments(ctx, anchor)
    : [];

  const pool = experimentId && anchor
    ? [
        anchor,
        ...(await Promise.all(
          scope.map(async (r) => getExperiment(ctx, r.experimentId))
        )),
      ].filter((e): e is ExperimentRecord => Boolean(e))
    : experiments;

  const byMetric = new Map<string, ExperimentRecord[]>();
  for (const exp of pool) {
    if (!exp || exp.status !== "completed") continue;
    const key = `${exp.platform ?? "any"}:${exp.successMetric}`;
    const list = byMetric.get(key) ?? [];
    list.push(exp);
    byMetric.set(key, list);
  }

  for (const [, group] of byMetric) {
    if (group.length < 2) continue;
    const observed = group
      .filter((exp): exp is NonNullable<typeof exp> => Boolean(exp))
      .map((exp) => {
        const cmp = exp.allocation.lastComparison;
        return {
          id: exp.id,
          name: exp.name,
          platform: exp.platform,
          objective: exp.objective,
          higherKey: cmp?.higherObservedVariantKey ?? null,
        };
      });
    const keys = new Set(observed.map((o) => o.higherKey).filter(Boolean) as string[]);
    if (keys.size < 2) continue;

    const platforms = new Set(observed.map((o) => o.platform).filter(Boolean));
    const objectives = new Set(observed.map((o) => o.objective));

    const differences: string[] = [];
    if (platforms.size > 1) {
      differences.push(
        "Results differ across platforms, so the experiments should not be treated as directly interchangeable."
      );
    }
    if (objectives.size > 1) {
      differences.push("Stated objectives differ between experiments.");
    }
    differences.push(
      `Higher-observed variant keys differ: ${[...keys].join(", ")}.`
    );

    const dominant = observed.filter((o) => o.higherKey === [...keys][0]);
    const other = observed.filter((o) => o.higherKey && o.higherKey !== [...keys][0]);

    findings.push({
      commonContext: [
        `Shared primary metric context among ${group.length} experiments.`,
        platforms.size === 1 ? `Platform: ${[...platforms][0]}` : "Multiple platforms in group.",
      ],
      supportingExperiments: dominant.map((o) => ({ id: o.id, name: o.name })),
      conflictingExperiments: other.map((o) => ({ id: o.id, name: o.name })),
      differences,
      limitations: [
        "Conflicts are not resolved automatically.",
        "Do not treat any experiment as a universal rule.",
      ],
    });
  }

  return findings;
}
