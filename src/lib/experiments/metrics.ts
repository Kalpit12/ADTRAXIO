import type { MetricSnapshot } from "@/lib/learning/types";

const METRIC_GETTERS: Record<string, (s: MetricSnapshot) => number | null> = {
  engagement: (s) => s.engagement,
  impressions: (s) => s.impressions,
  reach: (s) => s.reach,
  views: (s) => s.views,
  likes: (s) => s.likes,
  comments: (s) => s.comments,
  shares: (s) => s.shares,
  saves: (s) => s.saves,
  posts_published: (s) => s.postsPublished,
};

export function metricValueFromSnapshot(
  metric: string,
  snapshot: MetricSnapshot
): number | null {
  const key = metric.toLowerCase().replace(/\s+/g, "_");
  const getter = METRIC_GETTERS[key];
  if (!getter) return null;
  return getter(snapshot);
}

export function sampleCountFromSnapshot(snapshot: MetricSnapshot): number | null {
  if (snapshot.engagement != null) return snapshot.engagement;
  if (snapshot.impressions != null) return snapshot.impressions;
  if (snapshot.reach != null) return snapshot.reach;
  return null;
}
