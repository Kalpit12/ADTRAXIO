import type { EligibilityReport } from "./types";
import type { RiskReport, RiskLevel } from "./types";
import type { SimulationPreview } from "./types";

export function assessOptimizationRisk(input: {
  eligibility: EligibilityReport;
  simulation: SimulationPreview;
  proposalType: string;
  platform: string | null;
}): RiskReport {
  const factors: string[] = [];
  let level: RiskLevel = "low";

  if (input.eligibility.status !== "eligible") {
    return {
      level: "blocked",
      factors: ["Proposal is not eligible for approval.", ...input.eligibility.reasons],
      limitations: input.eligibility.limitations,
      requiresExtraConfirmation: false,
    };
  }

  if (input.simulation.affectedResources.length > 3) {
    factors.push("Multiple resources would be affected.");
    level = "medium";
  }

  if (input.proposalType === "allocation_change") {
    factors.push("Allocation changes affect experiment exposure (preview only in this phase).");
    level = level === "low" ? "medium" : level;
  }

  if (input.proposalType === "scheduling_change" || input.proposalType === "campaign_setting_change") {
    factors.push("Publishing or campaign impact possible in future execution phases.");
    level = "high";
  }

  if (input.platform) {
    factors.push(`Platform context: ${input.platform}.`);
  }

  factors.push("Changes are reversible in principle; rollback metadata is captured at approval.");

  return {
    level,
    factors,
    limitations: [
      "Risk level is operational, not a statistical confidence score.",
      "High-risk proposals require explicit additional confirmation at approval.",
    ],
    requiresExtraConfirmation: level === "high",
  };
}
