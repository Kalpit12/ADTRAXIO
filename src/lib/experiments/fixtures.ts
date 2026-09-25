/**
 * Synthetic fixture values for unit tests only — not production analytics.
 */
import type { MetricSnapshot } from "@/lib/learning/types";

function snap(engagement: number): MetricSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    windowDays: 7,
    impressions: engagement * 10,
    reach: engagement * 8,
    engagement,
    likes: Math.floor(engagement * 0.4),
    comments: Math.floor(engagement * 0.1),
    shares: null,
    saves: null,
    views: null,
    postsPublished: 1,
    publishingFrequencyPerWeek: null,
    campaignActiveCount: null,
  };
}

export const FIXTURE_EXPERIMENT_A = {
  name: "Fixture A — educational vs promotional",
  objective: "Increase engagement",
  hypothesis: "Educational carousel outperforms promotional",
  variantA: { baseline: snap(100), outcome: snap(118) },
  variantB: { baseline: snap(100), outcome: snap(105) },
};

export const FIXTURE_EXPERIMENT_B = {
  name: "Fixture B — promotional higher",
  objective: "Increase engagement",
  hypothesis: "Promotional carousel outperforms educational",
  variantA: { baseline: snap(90), outcome: snap(95) },
  variantB: { baseline: snap(90), outcome: snap(112) },
};

export const FIXTURE_EXPERIMENT_C_INCOMPLETE = {
  name: "Fixture C — incomplete",
  variantA: { baseline: snap(50), outcome: null as MetricSnapshot | null },
  variantB: { baseline: snap(50), outcome: snap(52) },
};

export const FIXTURE_EXPERIMENT_D_CONFLICT = {
  name: "Fixture D — conflicting classification",
  variantA: { baseline: snap(80), outcome: snap(120) },
  variantB: { baseline: snap(80), outcome: snap(90) },
  note: "Pair with Fixture B for mixed historical evidence tests.",
};
