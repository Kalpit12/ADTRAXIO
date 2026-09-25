import type { SocialPlatform } from "@/lib/onboarding/types";

export type MetricKey = "reach" | "engagement" | "clicks" | "conversions";

export type PerformanceRange = "7d" | "30d" | "90d";

export interface DashboardMetric {
  key: MetricKey;
  label: string;
  value: number | null;
  changePercent: number | null;
  hasData: boolean;
}

export interface PerformanceSeriesPoint {
  date: string;
  reach: number;
  engagement: number;
  clicks: number;
  conversions: number;
}

export interface DashboardCampaign {
  id: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed" | "archived";
  objective: string | null;
  contentCount: number;
  startDate: string | null;
  endDate: string | null;
}

export interface DashboardContentItem {
  id: string;
  title: string;
  platform: SocialPlatform | string;
  contentType: string;
  status: "draft" | "scheduled" | "published" | "failed";
  thumbnailUrl: string | null;
  createdAt: string;
}

export interface ConnectedAccount {
  platform: SocialPlatform;
  label: string;
  connected: boolean;
  accountName?: string | null;
  username?: string | null;
}

export interface DashboardUser {
  id: string;
  firstName: string;
  fullName: string | null;
  profileName: string | null;
  accountType: string | null;
}

export interface DashboardData {
  user: DashboardUser;
  metrics: DashboardMetric[];
  performanceSeries: PerformanceSeriesPoint[];
  hasPerformanceData: boolean;
  activeCampaignCount: number;
  campaigns: DashboardCampaign[];
  content: DashboardContentItem[];
  connectedAccounts: ConnectedAccount[];
  loading?: boolean;
  error?: string;
}
