import { compareSnapshots } from "@/lib/learning/compare";
import type { ComparisonJson, MetricSnapshot } from "@/lib/learning/types";
import type { StrategyObjectiveKind } from "./types";

const OBJECTIVE_METRICS: Record<StrategyObjectiveKind, string[]> = {
  awareness: ["Impressions", "Reach", "Views"],
  engagement: ["Engagement", "Likes", "Comments", "Shares", "Saves"],
  leads: [],
  sales: [],
  traffic: [],
  app_installs: [],
  growth: ["Engagement", "Reach", "Posts published"],
  consistency: ["Posts published", "Publishing frequency / week"],
};

export function compareForObjective(
  baseline: MetricSnapshot,
  outcome: MetricSnapshot,
  objective: StrategyObjectiveKind
): ComparisonJson {
  const full = compareSnapshots(baseline, outcome);
  const focus = OBJECTIVE_METRICS[objective] ?? OBJECTIVE_METRICS.growth;
  const rows = full.rows.filter(
    (r) => focus.includes(r.metric) || r.availability === "measured"
  );
  return {
    ...full,
    rows: rows.length ? rows : full.rows,
    summaryNote: `Objective-focused metrics: ${objective}`,
  };
}
