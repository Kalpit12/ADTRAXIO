import type { CAMPAIGN_OBJECTIVES, CAMPAIGN_STATUSES } from "./constants";

export type CampaignObjective = (typeof CAMPAIGN_OBJECTIVES)[number];
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export interface CampaignRecord {
  id: string;
  organizationId: string;
  createdBy: string | null;
  name: string;
  description: string | null;
  objective: CampaignObjective | null;
  status: CampaignStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  contentCount?: number;
  accountCount?: number;
  platforms?: string[];
  performanceSummary?: CampaignPerformanceSummary | null;
}

export interface CampaignDetail extends CampaignRecord {
  content: CampaignContentItem[];
  accounts: CampaignAccountItem[];
  publishing: CampaignPublishingCounts;
}

export interface CampaignContentItem {
  id: string;
  contentId: string;
  headline: string | null;
  platform: string | null;
  status: string | null;
  attachedAt: string;
  publishingStatus: string | null;
  publishedAt: string | null;
}

export interface CampaignAccountItem {
  id: string;
  socialAccountId: string;
  platform: string;
  accountName: string | null;
  username: string | null;
  attachedAt: string;
}

export interface CampaignPublishingCounts {
  published: number;
  scheduled: number;
  failed: number;
}

export interface CampaignPerformanceSummary {
  impressions: number | null;
  reach: number | null;
  engagement: number | null;
  engagementRate: number | null;
}

export interface CampaignPerformance {
  summary: CampaignPerformanceSummary;
  trend: Array<{
    date: string;
    impressions: number | null;
    reach: number | null;
    engagement: number | null;
  }>;
  contentBreakdown: Array<{
    contentId: string;
    headline: string | null;
    impressions: number | null;
    reach: number | null;
    engagement: number | null;
    engagementRate: number | null;
  }>;
  platformBreakdown: Array<{
    platform: string;
    impressions: number | null;
    reach: number | null;
    engagement: number | null;
  }>;
  hasData: boolean;
}

export interface CreateCampaignInput {
  name: string;
  description?: string | null;
  objective: CampaignObjective;
  status?: CampaignStatus;
  startDate?: string | null;
  endDate?: string | null;
  socialAccountIds?: string[];
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string | null;
  objective?: CampaignObjective;
  status?: CampaignStatus;
  startDate?: string | null;
  endDate?: string | null;
}
