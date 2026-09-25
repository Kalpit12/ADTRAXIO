import type { ComparisonJson } from "@/lib/learning/types";
import type { AttributionJson, ResultClassification, StrategyObjectiveKind } from "./types";

export function classifyResult(
  comparison: ComparisonJson,
  objective: StrategyObjectiveKind
): ResultClassification {
  const measured = comparison.rows.filter((r) => r.availability === "measured");
  if (!measured.length) return "insufficient_data";

  let positive = 0;
  let negative = 0;
  for (const row of measured) {
    if (row.absoluteChange == null) continue;
    if (row.absoluteChange > 0) positive += 1;
    if (row.absoluteChange < 0) negative += 1;
  }
  if (positive === 0 && negative === 0) return "inconclusive";
  if (positive > 0 && negative > 0) return "mixed_signal";
  if (positive > 0) return "positive_signal";
  if (negative > 0) return "negative_signal";
  return "inconclusive";
}

export function buildAttribution(
  comparison: ComparisonJson,
  executionPlanId: string | null,
  otherActivityNote?: string
): AttributionJson {
  const evidence: string[] = [];
  for (const row of comparison.rows) {
    if (row.availability !== "measured" || row.absoluteChange == null) continue;
    const pct =
      row.percentChange != null ? ` (${row.percentChange}%)` : "";
    evidence.push(
      `${row.metric} changed from ${row.baseline} to ${row.outcome}${pct}.`
    );
  }

  const limitations: string[] = [
    "Outcome may correlate with strategy actions but does not prove causation.",
  ];
  if (executionPlanId) {
    limitations.push(
      "Other workspace activity may have occurred during the same measurement window."
    );
  }
  if (otherActivityNote) limitations.push(otherActivityNote);

  let level: AttributionJson["level"] = "insufficient_evidence";
  if (evidence.length >= 3) level = "correlation_only";
  else if (evidence.length >= 1) level = "supporting_evidence";

  return {
    version: 1,
    level,
    evidence: evidence.slice(0, 8),
    limitations,
  };
}
