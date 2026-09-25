export const DEFAULT_ANALYSIS_PRESET = "30d" as const;

export const MEANINGFUL_CHANGE_THRESHOLD_PERCENT = 10;

export const SAMPLE_SIZE_INSUFFICIENT = 3;
export const SAMPLE_SIZE_LOW = 5;
export const SAMPLE_SIZE_RELIABLE = 6;

export const MAX_TOP_CONTENT = 5;
export const MAX_UNDERPERFORMING = 5;
export const MAX_CAMPAIGNS = 8;
export const MAX_TIMING_SAMPLES = 20;

export const RECOMMENDATION_TYPES = [
  "growth",
  "content",
  "platform",
  "campaign",
  "timing",
] as const;

export const RECOMMENDATION_STATUSES = [
  "new",
  "reviewed",
  "dismissed",
  "acted_on",
] as const;

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;

export const PRIORITY_LEVELS = ["high", "medium", "low"] as const;

export const SUMMARY_RECORD_KIND = "summary";
