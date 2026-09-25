import type { AssistantContext } from "@/lib/assistant/types";
import type { ExperimentHistoryItem, ExperimentRecord, RelatedExperimentRef } from "./types";
import { queryExperimentHistory } from "./history";

function topicTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 3)
  );
}

function overlapScore(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n += 1;
  return n;
}

export async function findRelatedExperiments(
  ctx: AssistantContext,
  experiment: ExperimentRecord,
  limit = 5
): Promise<RelatedExperimentRef[]> {
  const history = await queryExperimentHistory(ctx, { limit: 30 });
  const candidates = history.filter((h) => h.id !== experiment.id);
  const hypo = topicTokens(`${experiment.hypothesis} ${experiment.objective}`);

  const refs: RelatedExperimentRef[] = [];
  for (const item of candidates) {
    const reasons: string[] = [];
    if (item.platform && experiment.platform && item.platform === experiment.platform) {
      reasons.push(`same platform (${item.platform})`);
    }
    if (item.primaryMetric === experiment.successMetric) {
      reasons.push(`same primary metric (${item.primaryMetric})`);
    }
    if (item.objective && experiment.objective) {
      const objOverlap = overlapScore(
        topicTokens(item.objective),
        topicTokens(experiment.objective)
      );
      if (objOverlap >= 2) reasons.push("similar objective wording");
    }
    const itemTokens = topicTokens(`${item.objective} ${item.name}`);
    const hypoOverlap = overlapScore(hypo, itemTokens);
    if (hypoOverlap >= 2) reasons.push("similar hypothesis/topic");

    if (!reasons.length) continue;
    refs.push({
      experimentId: item.id,
      name: item.name,
      objective: item.objective,
      platform: item.platform,
      successMetric: item.primaryMetric,
      reason: `Related because ${reasons.join("; ")}.`,
    });
  }

  return refs.slice(0, limit);
}

export function rankRelatedIds(refs: RelatedExperimentRef[]): string[] {
  return refs.map((r) => r.experimentId);
}
