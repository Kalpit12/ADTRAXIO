import { META_GRAPH_API_VERSION } from "@/lib/social/config";
import { engagementRate } from "../capabilities";
import type {
  AccountDailyMetrics,
  AnalyticsPlatform,
  AnalyticsProvider,
  ContentMetrics,
} from "../types";

const FACEBOOK_HOST = "https://graph.facebook.com";
const INSTAGRAM_HOST = "https://graph.instagram.com";

type InsightValue = { value?: number; end_time?: string };

type InsightSeries = {
  name?: string;
  period?: string;
  values?: InsightValue[];
  total_value?: { value?: number };
};

function resolveHost(
  platform: AnalyticsPlatform,
  connectionTarget: "facebook" | "instagram"
): string {
  if (platform === "instagram" && connectionTarget === "instagram") {
    return INSTAGRAM_HOST;
  }
  return FACEBOOK_HOST;
}

function parseEndDate(endTime?: string): string | null {
  if (!endTime) return null;
  const date = new Date(endTime);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url);
  if (!response.ok) return null;

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function indexDailySeries(
  series: InsightSeries[],
  metricNames: string[]
): Map<string, Partial<Record<string, number | null>>> {
  const byDate = new Map<string, Partial<Record<string, number | null>>>();

  for (const metricName of metricNames) {
    const entry = series.find((item) => item.name === metricName);
    if (!entry?.values) continue;

    for (const point of entry.values) {
      const date = parseEndDate(point.end_time);
      if (!date) continue;
      const row = byDate.get(date) ?? {};
      row[metricName] = toNumber(point.value);
      byDate.set(date, row);
    }
  }

  return byDate;
}

export const metaAnalyticsProvider: AnalyticsProvider = {
  getAvailableAccountMetrics({ platform, connectionTarget }) {
    if (platform === "facebook") {
      return ["page_post_engagements", "page_impressions", "page_impressions_unique"];
    }
    if (connectionTarget === "instagram") {
      return ["reach", "views", "accounts_engaged"];
    }
    return ["reach", "views", "accounts_engaged"];
  },

  getAvailableContentMetrics({ platform }) {
    if (platform === "facebook") {
      return ["post_impressions", "post_impressions_unique", "post_engaged_users"];
    }
    return ["reach", "likes", "comments", "shares", "saved", "total_interactions"];
  },

  async getProfileMetrics(input) {
    const host = resolveHost(input.platform, input.connectionTarget);
    const fields =
      input.platform === "facebook"
        ? "followers_count,fan_count"
        : "followers_count,follows_count";

    const params = new URLSearchParams({
      fields,
      access_token: input.accessToken,
    });

    const url = `${host}/${META_GRAPH_API_VERSION}/${input.platformAccountId}?${params}`;
    const payload = await fetchJson<{
      followers_count?: number;
      fan_count?: number;
      follows_count?: number;
    }>(url);

    return {
      followers: toNumber(payload?.followers_count ?? payload?.fan_count),
      following: toNumber(payload?.follows_count),
    };
  },

  async getAccountInsights(input) {
    const host = resolveHost(input.platform, input.connectionTarget);
    const sinceUnix = Math.floor(new Date(input.since).getTime() / 1000);
    const untilUnix = Math.floor(new Date(input.until).getTime() / 1000);

    if (input.platform === "facebook") {
      const metrics = this.getAvailableAccountMetrics(input).join(",");
      const params = new URLSearchParams({
        metric: metrics,
        period: "day",
        since: String(sinceUnix),
        until: String(untilUnix),
        access_token: input.accessToken,
      });

      const url = `${host}/${META_GRAPH_API_VERSION}/${input.platformAccountId}/insights?${params}`;
      const payload = await fetchJson<{ data?: InsightSeries[] }>(url);
      const indexed = indexDailySeries(payload?.data ?? [], [
        "page_post_engagements",
        "page_impressions",
        "page_impressions_unique",
      ]);

      return Array.from(indexed.entries()).map(([metricDate, values]) => ({
        metricDate,
        followers: null,
        following: null,
        profileViews: null,
        impressions: values.page_impressions ?? null,
        reach: values.page_impressions_unique ?? null,
        engagement: values.page_post_engagements ?? null,
        likes: null,
        comments: null,
        shares: null,
        saves: null,
        clicks: null,
        videoViews: null,
      }));
    }

    const metrics = "reach,views,accounts_engaged";
    const params = new URLSearchParams({
      metric: metrics,
      metric_type: "total_value",
      period: "day",
      since: String(sinceUnix),
      until: String(untilUnix),
      access_token: input.accessToken,
    });

    const url = `${host}/${META_GRAPH_API_VERSION}/${input.platformAccountId}/insights?${params}`;
    const payload = await fetchJson<{ data?: InsightSeries[] }>(url);

    const byDate = new Map<string, AccountDailyMetrics>();

    for (const item of payload?.data ?? []) {
      if (!item.name) continue;

      for (const point of item.values ?? []) {
        const metricDate = parseEndDate(point.end_time);
        if (!metricDate) continue;

        const existing =
          byDate.get(metricDate) ??
          ({
            metricDate,
            followers: null,
            following: null,
            profileViews: null,
            impressions: null,
            reach: null,
            engagement: null,
            likes: null,
            comments: null,
            shares: null,
            saves: null,
            clicks: null,
            videoViews: null,
          } satisfies AccountDailyMetrics);

        const value = toNumber(point.value);
        if (item.name === "reach") existing.reach = value;
        if (item.name === "views") existing.impressions = value;
        if (item.name === "accounts_engaged") existing.engagement = value;

        byDate.set(metricDate, existing);
      }

      if (item.total_value?.value != null && item.name) {
        const today = new Date().toISOString().slice(0, 10);
        const existing =
          byDate.get(today) ??
          ({
            metricDate: today,
            followers: null,
            following: null,
            profileViews: null,
            impressions: null,
            reach: null,
            engagement: null,
            likes: null,
            comments: null,
            shares: null,
            saves: null,
            clicks: null,
            videoViews: null,
          } satisfies AccountDailyMetrics);

        const value = toNumber(item.total_value.value);
        if (item.name === "reach") existing.reach = value;
        if (item.name === "views") existing.impressions = value;
        if (item.name === "accounts_engaged") existing.engagement = value;
        byDate.set(today, existing);
      }
    }

    return Array.from(byDate.values());
  },

  async getContentInsights(input) {
    const host = resolveHost(input.platform, input.connectionTarget);
    const metricDate = new Date().toISOString().slice(0, 10);

    if (input.platform === "facebook") {
      const metrics = this.getAvailableContentMetrics(input).join(",");
      const params = new URLSearchParams({
        metric: metrics,
        access_token: input.accessToken,
      });

      const url = `${host}/${META_GRAPH_API_VERSION}/${input.platformPostId}/insights?${params}`;
      const payload = await fetchJson<{ data?: InsightSeries[] }>(url);
      if (!payload?.data?.length) return null;

      const values: Record<string, number | null> = {};
      for (const item of payload.data) {
        if (!item.name) continue;
        values[item.name] = toNumber(item.values?.[0]?.value ?? item.total_value?.value);
      }

      const reach = values.post_impressions_unique ?? null;
      const engagement = values.post_engaged_users ?? null;

      return {
        platformPostId: input.platformPostId,
        metricDate,
        impressions: values.post_impressions ?? null,
        reach,
        likes: null,
        comments: null,
        shares: null,
        saves: null,
        clicks: null,
        videoViews: null,
        engagementRate: engagementRate(engagement, reach),
      };
    }

    const metrics = this.getAvailableContentMetrics(input).join(",");
    const params = new URLSearchParams({
      metric: metrics,
      access_token: input.accessToken,
    });

    const url = `${host}/${META_GRAPH_API_VERSION}/${input.platformPostId}/insights?${params}`;
    const payload = await fetchJson<{ data?: InsightSeries[] }>(url);
    if (!payload?.data?.length) return null;

    const values: Record<string, number | null> = {};
    for (const item of payload.data) {
      if (!item.name) continue;
      values[item.name] = toNumber(item.values?.[0]?.value ?? item.total_value?.value);
    }

    const reach = values.reach ?? null;
    const engagement =
      values.total_interactions ??
      sumNullable([
        values.likes,
        values.comments,
        values.shares,
        values.saved,
      ]);

    return {
      platformPostId: input.platformPostId,
      metricDate,
      impressions: null,
      reach,
      likes: values.likes ?? null,
      comments: values.comments ?? null,
      shares: values.shares ?? null,
      saves: values.saved ?? null,
      clicks: null,
      videoViews: null,
      engagementRate: engagementRate(engagement, reach),
    };
  },
};

function sumNullable(values: Array<number | null>): number | null {
  if (values.every((value) => value == null)) return null;
  return values.reduce<number>((acc, value) => acc + (value ?? 0), 0);
}
