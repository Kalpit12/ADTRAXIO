import type { SimulationPreview } from "./types";

export function buildSimulationPreview(input: {
  currentState: Record<string, unknown>;
  proposedState: Record<string, unknown>;
  proposalType: string;
  evidenceBasis: string[];
}): SimulationPreview {
  const affectedResources: SimulationPreview["affectedResources"] = [];
  if (input.currentState.experimentId) {
    affectedResources.push({
      type: "experiment",
      id: String(input.currentState.experimentId),
      label: "Experiment allocation (preview only)",
    });
  }

  const expectedDifference: string[] = [];
  const curAlloc = input.currentState.allocations as Record<string, number> | undefined;
  const propAlloc = input.proposedState.allocations as Record<string, number> | undefined;
  if (curAlloc && propAlloc) {
    for (const key of Object.keys(propAlloc)) {
      const from = curAlloc[key];
      const to = propAlloc[key];
      if (from != null && to != null && from !== to) {
        expectedDifference.push(
          `Projected allocation for variant ${key} changes from ${from}% to ${to}% (not a performance forecast).`
        );
      }
    }
  }
  if (!expectedDifference.length) {
    expectedDifference.push(
      "Projected state differs from current state; no performance outcome is predicted."
    );
  }

  return {
    currentState: input.currentState,
    proposedState: input.proposedState,
    affectedResources,
    expectedDifference,
    evidenceBasis: input.evidenceBasis,
    limitations: [
      "Simulation is a structural preview only.",
      "No engagement, revenue, or reach forecasts are provided.",
    ],
  };
}
