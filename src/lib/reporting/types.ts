import type { AnalyticsPlatform } from "@/lib/analytics/types";

export type ReportStatus = "draft" | "published" | "archived";
export type ReportVisibility = "internal" | "client";

export type ReportPermission =
  | "report_view"
  | "report_create"
  | "report_edit"
  | "report_publish"
  | "report_archive";

export interface ReportRecord {
  id: string;
  organizationId: string;
  clientWorkspaceId: string;
  createdBy: string;
  name: string;
  description: string | null;
  dateFrom: string;
  dateTo: string;
  status: ReportStatus;
  visibility: ReportVisibility;
  platforms: string[];
  includeCampaigns: boolean;
  includeContent: boolean;
  includePlatforms: boolean;
  includeAiSummary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReportListItem extends ReportRecord {
  clientName: string | null;
  lastGeneratedAt: string | null;
  latestSnapshotId: string | null;
}

export interface ReportSnapshotRecord {
  id: string;
  reportId: string;
  organizationId: string;
  clientWorkspaceId: string;
  generatedBy: string;
  generatedAt: string;
  data: ReportSnapshotData;
  createdAt: string;
}

export interface ReportOverviewMetrics {
  impressions: number | null;
  reach: number | null;
  engagement: number | null;
  engagementRate: number | null;
  followers: number | null;
  publishedContent: number;
  activeCampaigns: number;
  completedCampaigns: number;
  hasData: boolean;
}

export interface ReportGrowthMetric {
  key: string;
  label: string;
  current: number | null;
  previous: number | null;
  changePercent: number | null;
}

export interface ReportPlatformMetrics {
  platform: AnalyticsPlatform | string;
  impressions: number | null;
  reach: number | null;
  engagement: number | null;
  followers: number | null;
  hasData: boolean;
}

export interface ReportContentItem {
  id: string;
  platform: string;
  caption: string | null;
  publishedAt: string | null;
  accountName: string | null;
  impressions: number | null;
  reach: number | null;
  engagement: number | null;
  engagementRate: number | null;
}

export interface ReportCampaignItem {
  id: string;
  name: string;
  objective: string | null;
  status: string;
  contentCount: number;
  impressions: number | null;
  reach: number | null;
  engagement: number | null;
  startDate: string | null;
  endDate: string | null;
}

export interface ReportRecommendationItem {
  id: string;
  title: string;
  observation: string | null;
  recommendation: string | null;
  type: string;
  priority: string | null;
}

export interface ReportAiSummary {
  executiveSummary: string;
  keyObservations: string[];
  notableChanges: string[];
  recommendedActions: string[];
}

export interface ReportSnapshotData {
  version: 1;
  generatedAt: string;
  period: { from: string; to: string };
  client: { id: string; name: string };
  report: { id: string; name: string; description: string | null };
  config: {
    platforms: string[];
    includeCampaigns: boolean;
    includeContent: boolean;
    includePlatforms: boolean;
    includeAiSummary: boolean;
  };
  overview: ReportOverviewMetrics;
  growth: ReportGrowthMetric[];
  platforms: ReportPlatformMetrics[];
  content: ReportContentItem[];
  campaigns: ReportCampaignItem[];
  recommendations: ReportRecommendationItem[];
  aiSummary: ReportAiSummary | null;
}

export interface CreateReportInput {
  name: string;
  description?: string | null;
  dateFrom: string;
  dateTo: string;
  visibility?: ReportVisibility;
  platforms?: string[];
  includeCampaigns?: boolean;
  includeContent?: boolean;
  includePlatforms?: boolean;
  includeAiSummary?: boolean;
}

export interface UpdateReportInput {
  name?: string;
  description?: string | null;
  dateFrom?: string;
  dateTo?: string;
  visibility?: ReportVisibility;
  platforms?: string[];
  includeCampaigns?: boolean;
  includeContent?: boolean;
  includePlatforms?: boolean;
  includeAiSummary?: boolean;
}

export interface ReportingContext {
  organizationId: string;
  userId: string;
  clientWorkspaceId: string;
  clientWorkspaceName: string;
  isAgency: boolean;
  clientRole: import("@/lib/workspaces/types").ClientRole | null;
  orgRole: string | null;
}
