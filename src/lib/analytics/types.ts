export type AnalyticsPlatform = "facebook" | "instagram";

export interface AccountDailyMetrics {
  metricDate: string;
  followers: number | null;
  following: number | null;
  profileViews: number | null;
  impressions: number | null;
  reach: number | null;
  engagement: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
  videoViews: number | null;
}

export interface ContentMetrics {
  platformPostId: string;
  metricDate: string;
  impressions: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
  videoViews: number | null;
  engagementRate: number | null;
}

export interface AnalyticsDateRange {
  from: string;
  to: string;
}

export interface AnalyticsOverview {
  summary: {
    impressions: number | null;
    reach: number | null;
    engagement: number | null;
    followers: number | null;
    hasData: boolean;
  };
  series: Array<{
    date: string;
    impressions: number | null;
    reach: number | null;
    engagement: number | null;
  }>;
  platforms: Array<{
    platform: AnalyticsPlatform;
    impressions: number | null;
    reach: number | null;
    engagement: number | null;
    hasData: boolean;
  }>;
}

export interface AccountPerformanceSummary {
  socialAccountId: string;
  platform: AnalyticsPlatform;
  accountName: string | null;
  username: string | null;
  impressions: number | null;
  reach: number | null;
  engagement: number | null;
  followers: number | null;
  lastSyncedDate: string | null;
}

export interface ContentPerformanceRow {
  id: string;
  scheduledPostId: string | null;
  platformPostId: string;
  platform: AnalyticsPlatform;
  caption: string | null;
  publishedAt: string | null;
  accountName: string | null;
  impressions: number | null;
  reach: number | null;
  engagement: number | null;
  engagementRate: number | null;
}

export interface SyncAccountResult {
  socialAccountId: string;
  platform: AnalyticsPlatform;
  accountName: string | null;
  success: boolean;
  dailySnapshots: number;
  contentSnapshots: number;
  error?: string;
}

export interface SyncSummary {
  syncedAt: string;
  accounts: SyncAccountResult[];
  successCount: number;
  failureCount: number;
}

export interface AnalyticsProvider {
  getAvailableAccountMetrics(input: {
    platform: AnalyticsPlatform;
    connectionTarget: "facebook" | "instagram";
  }): string[];
  getAvailableContentMetrics(input: {
    platform: AnalyticsPlatform;
    connectionTarget: "facebook" | "instagram";
  }): string[];
  getProfileMetrics(input: {
    platform: AnalyticsPlatform;
    platformAccountId: string;
    accessToken: string;
    connectionTarget: "facebook" | "instagram";
  }): Promise<Pick<AccountDailyMetrics, "followers" | "following">>;
  getAccountInsights(input: {
    platform: AnalyticsPlatform;
    platformAccountId: string;
    accessToken: string;
    connectionTarget: "facebook" | "instagram";
    since: string;
    until: string;
  }): Promise<AccountDailyMetrics[]>;
  getContentInsights(input: {
    platform: AnalyticsPlatform;
    platformPostId: string;
    accessToken: string;
    connectionTarget: "facebook" | "instagram";
  }): Promise<ContentMetrics | null>;
}
