export interface AssistantHomeMetric {
  key: "reach" | "engagement" | "impressions";
  label: string;
  value: number | null;
  changePercent: number | null;
  hasData: boolean;
}

export interface AssistantHomeTopContent {
  id: string;
  platform: string;
  caption: string | null;
  engagement: number | null;
  accountName: string | null;
}

export interface AssistantHomeRecommendation {
  id: string;
  title: string;
  observation: string | null;
  recommendation: string | null;
}

export interface AssistantHomeGrowthBrief {
  id: string;
  briefType: "daily" | "weekly";
  summary: string;
  generatedAt: string;
  engagementChangePercent: number | null;
  failedPostsCount: number;
  highlightLines: string[];
  nextActionTitle: string | null;
  nextActionPrompt: string | null;
}

export interface AssistantHomePayload {
  workspaceLabel: string;
  needsClientSelection: boolean;
  hasInsights: boolean;
  periodLabel: string;
  performance: AssistantHomeMetric[];
  topContent: AssistantHomeTopContent[];
  nextAction: AssistantHomeRecommendation | null;
  publishing: {
    scheduledCount: number;
    needsAttentionCount: number;
  } | null;
  growthBrief: AssistantHomeGrowthBrief | null;
}
