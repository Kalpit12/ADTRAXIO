import type { AssistantContext } from "@/lib/assistant/types";
import { getCrossExperimentEvidence } from "@/lib/evidence/patterns";
import type { EligibilityStatus, OptimizationOpportunity } from "./types";

export async function listOptimizationOpportunities(
  ctx: AssistantContext
): Promise<OptimizationOpportunity[]> {
  const cross = await getCrossExperimentEvidence(ctx, { limit: 15 });
  if (cross.classification !== "consistent_observed_pattern" && cross.sampleCount < 2) {
    return [];
  }
  return [
    {
      type: "allocation_change" as const,
      sourceType: "experiment",
      sourceId: cross.traceability[0]?.experimentId ?? "",
      evidence: cross.supportingObservations.map(
        (o) => `experimentId:${o.experimentId} — ${o.experimentName}`
      ),
      eligibility: (cross.classification === "consistent_observed_pattern"
        ? "eligible"
        : "insufficient_evidence") as EligibilityStatus,
      rationale:
        cross.classification === "consistent_observed_pattern"
          ? "Repeated observed pattern may warrant a controlled allocation review (opportunity only)."
          : "Evidence does not yet support a concrete optimization opportunity.",
      limitations: [
        ...cross.limitations,
        "optimizationOpportunity — not executeOptimization.",
      ],
    },
  ].filter((o) => o.sourceId);
}

export function formatOptimizationOpportunitiesForStrategist(
  opportunities: OptimizationOpportunity[]
): string {
  if (!opportunities.length) {
    return "No optimization opportunities identified for automatic review.";
  }
  return opportunities
    .map((o) =>
      [
        "OPTIMIZATION OPPORTUNITY (review only, no execution):",
        `  type: ${o.type}`,
        `  source: ${o.sourceType}:${o.sourceId}`,
        `  eligibility: ${o.eligibility}`,
        `  rationale: ${o.rationale}`,
        `  limitation: ${o.limitations[0] ?? "—"}`,
      ].join("\n")
    )
    .join("\n\n");
}
