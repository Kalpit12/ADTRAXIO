import type { DashboardData } from "./types";

type DashboardResult = { data?: DashboardData; error?: string };

let inFlight: Promise<DashboardResult> | null = null;
let lastResult: DashboardResult | null = null;

export function peekDashboardDataCache(): DashboardResult | null {
  return lastResult;
}

export function invalidateDashboardDataCache() {
  inFlight = null;
  lastResult = null;
}

export async function getCachedDashboardData(
  loader: () => Promise<DashboardResult>
): Promise<DashboardResult> {
  if (lastResult?.data && !lastResult.error) {
    return lastResult;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = loader()
    .then((result) => {
      lastResult = result;
      return result;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
