/** Default proposal TTL — limits stale approvals without revalidation. */
export const OPTIMIZATION_PROPOSAL_TTL_HOURS = 24;

/** Minimum completed experiments before allocation-style proposals may be eligible. */
export const MIN_COMPLETED_EXPERIMENTS_FOR_ALLOCATION = 2;
// Documented: avoids single-experiment "winner" optimization without cross-check.

/** Minimum measured variant rows across experiments for comparison evidence. */
export const MIN_MEASURED_OBSERVATIONS = 2;
// Documented: ensures more than one data point exists; not a statistical power claim.

/** Evidence quality statuses treated as usable for review (not strong-only). */
export const USABLE_EVIDENCE_QUALITIES = new Set([
  "comparable",
  "strong",
  "usable",
  "limited",
]);

/** Max age of experiment end date for non-stale evidence (days). */
export const MAX_EVIDENCE_AGE_DAYS = 120;
// Documented: old experiments may not reflect current audience/platform context.

export const SUPPORTED_PROPOSAL_TYPES = [
  "allocation_change",
  "content_selection",
  "scheduling_change",
  "campaign_setting_change",
] as const;
