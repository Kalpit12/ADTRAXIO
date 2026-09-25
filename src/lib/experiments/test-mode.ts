/**
 * Server-only experiment test mode. Never trust client flags.
 */
export function isExperimentTestMode(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.EXPERIMENT_TEST_MODE?.trim() === "true";
}

export function canForceExperimentMeasurement(): boolean {
  return isExperimentTestMode();
}

/** Observation window in ms when test mode is active (immediate). */
export function experimentObservationWindowMs(minimumObservationDays: number): number {
  if (isExperimentTestMode()) return 0;
  return minimumObservationDays * 24 * 60 * 60 * 1000;
}

export function observationWindowElapsed(
  startedAt: string,
  minimumObservationDays: number
): boolean {
  const windowMs = experimentObservationWindowMs(minimumObservationDays);
  if (windowMs === 0 && isExperimentTestMode()) return true;
  return Date.now() - new Date(startedAt).getTime() >= windowMs;
}
