export type GrowthBriefType = "daily" | "weekly";
export type GrowthBriefStatus = "generated" | "reviewed" | "archived";

export type GrowthInsightType =
  | "performance_change"
  | "content_pattern"
  | "campaign_change"
  | "publishing_issue"
  | "growth_opportunity"
  | "consistency_issue"
  | "platform_change"
  | "recommendation";

export type GrowthInsightSeverity = "info" | "attention" | "important";

export type GrowthRecommendationActionType =
  | "create_content"
  | "create_strategy"
  | "review_campaign"
  | "review_scheduled_posts"
  | "create_report"
  | "repurpose_content";

export type GrowthConfidence = "high" | "medium" | "low";

export interface GrowthInsight {
  type: GrowthInsightType;
  title: string;
  observation: string;
  evidence: string[];
  severity: GrowthInsightSeverity;
  confidence: GrowthConfidence;
}

export interface GrowthRecommendation {
  title: string;
  reason: string;
  evidence: string[];
  actionType: GrowthRecommendationActionType;
  priority: "high" | "medium" | "low";
  assistantPrompt?: string;
}

export interface GrowthBriefMetrics {
  periodLabel: string;
  engagementChangePercent: number | null;
  reachChangePercent: number | null;
  impressionsChangePercent: number | null;
  failedPostsCount: number;
  scheduledPostsCount: number;
  topContentCount: number;
  connectedAccounts: number;
}

export interface GrowthBriefRecord {
  id: string;
  organizationId: string;
  clientWorkspaceId: string | null;
  periodStart: string;
  periodEnd: string;
  briefType: GrowthBriefType;
  status: GrowthBriefStatus;
  summary: string;
  insights: GrowthInsight[];
  recommendations: GrowthRecommendation[];
  metrics: GrowthBriefMetrics;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthBriefSummary {
  id: string;
  briefType: GrowthBriefType;
  summary: string;
  generatedAt: string;
  engagementChangePercent: number | null;
  failedPostsCount: number;
  topInsightTitles: string[];
  nextRecommendation: GrowthRecommendation | null;
}

export interface AgentAnalysisFacts {
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  briefType: GrowthBriefType;
  dataGaps: string[];
  hasSufficientData: boolean;
  hasMeaningfulChange: boolean;
  metricChanges: Array<{
    metric: string;
    current: number | null;
    previous: number | null;
    changePercent: number | null;
    meaningful: boolean;
  }>;
  failedPosts: Array<{ id: string; platform: string; error: string | null }>;
  scheduledUpcomingCount: number;
  topContent: Array<{
    id: string;
    platform: string;
    headline: string | null;
    engagement: number | null;
    contentType: string | null;
  }>;
  contentPatterns: string[];
  intelligenceRecommendations: Array<{ title: string; observation: string | null }>;
  brandGoals: string[];
  brandVoice: string | null;
}

export interface ValidatedBriefOutput {
  summary: string;
  insights: GrowthInsight[];
  recommendations: GrowthRecommendation[];
}
