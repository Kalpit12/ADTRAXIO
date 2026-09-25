import type { AnalyticsPlatform } from "./types";

export function hasInsightsScope(
  platform: AnalyticsPlatform,
  connectionTarget: "facebook" | "instagram",
  scopes: string[]
): boolean {
  if (platform === "facebook") {
    return scopes.includes("pages_read_engagement");
  }

  if (connectionTarget === "instagram") {
    return (
      scopes.includes("instagram_business_manage_insights") ||
      scopes.includes("instagram_business_basic")
    );
  }

  return (
    scopes.includes("instagram_manage_insights") ||
    scopes.includes("pages_read_engagement")
  );
}

export function engagementRate(
  engagement: number | null,
  reach: number | null
): number | null {
  if (engagement == null || reach == null || reach === 0) {
    return null;
  }
  return Number(((engagement / reach) * 100).toFixed(2));
}
