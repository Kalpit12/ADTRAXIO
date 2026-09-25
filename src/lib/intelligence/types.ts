import type {
  CONFIDENCE_LEVELS,
  PRIORITY_LEVELS,
  RECOMMENDATION_STATUSES,
  RECOMMENDATION_TYPES,
} from "./constants";

export type RecommendationType = (typeof RECOMMENDATION_TYPES)[number];
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export interface PeriodMetrics {
  impressions: number | null;
  reach: number | null;
  engagement: number | null;
}

export interface MetricChange {
  metric: string;
  current: number | null;
  previous: number | null;
  changePercent: number | null;
  meaningful: boolean;
  direction: "up" | "down" | "flat" | "unknown";
}

export interface ContentAnalysisItem {
  contentId: string | null;
  headline: string | null;
  platform: string;
  contentType: string | null;
  tone: string | null;
  goal: string | null;
  engagement: number | null;
  reach: number | null;
  impressions: number | null;
  publishedAt: string | null;
}

export interface CampaignAnalysisItem {
  campaignId: string;
  name: string;
  status: string;
  objective: string | null;
  contentCount: number;
  engagement: number | null;
  reach: number | null;
}

export interface PlatformComparisonItem {
  platform: string;
  currentEngagement: number | null;
  previousEngagement: number | null;
  changePercent: number | null;
  contentCount: number;
}

export interface ContentPatternItem {
  label: string;
  dimension: "content_type" | "tone" | "goal";
  count: number;
  avgEngagement: number | null;
  sampleConfidence: ConfidenceLevel | "insufficient";
}

export interface PublishingPatternSummary {
  publishedInPeriod: number;
  scheduledInPeriod: number;
  postsPerWeek: number | null;
  daysWithPosts: number;
  totalDays: number;
}

export interface TimingPatternItem {
  dayOfWeek: string;
  postCount: number;
  avgEngagement: number | null;
}

export interface DataAvailability {
  connectedAccounts: number;
  hasAnalytics: boolean;
  hasPublishedContent: boolean;
  hasCampaigns: boolean;
  analyticsRowCount: number;
  contentWithMetricsCount: number;
  sufficientForInsights: boolean;
  sufficientForRecommendations: boolean;
}

export interface IntelligenceAnalysisContext {
  scope: "organization" | "campaign";
  campaignId: string | null;
  campaignName: string | null;
  period: { from: string; to: string };
  previousPeriod: { from: string; to: string };
  platforms: string[];
  dataAvailability: DataAvailability;
  summary: {
    current: PeriodMetrics;
    previous: PeriodMetrics;
  };
  changes: MetricChange[];
  topContent: ContentAnalysisItem[];
  underperformingContent: ContentAnalysisItem[];
  platformComparison: PlatformComparisonItem[];
  campaigns: CampaignAnalysisItem[];
  contentPatterns: ContentPatternItem[];
  publishingPatterns: PublishingPatternSummary;
  timingPatterns: {
    sufficient: boolean;
    items: TimingPatternItem[];
  };
}

export interface AIInsightOutput {
  title: string;
  observation: string;
  evidence: string[];
  confidence: ConfidenceLevel;
  type: RecommendationType;
}

export interface AIRecommendationOutput {
  title: string;
  action: string;
  reason: string;
  evidence: string[];
  priority: PriorityLevel;
  type: RecommendationType;
}

export interface AIGenerationOutput {
  summary: string;
  insights: AIInsightOutput[];
  recommendations: AIRecommendationOutput[];
}

export interface IntelligenceRecord {
  id: string;
  organizationId: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  type: RecommendationType;
  title: string;
  observation: string | null;
  recommendation: string | null;
  evidence: string[];
  confidence: ConfidenceLevel | null;
  priority: PriorityLevel | null;
  status: RecommendationStatus;
  recordKind: "summary" | "insight" | "recommendation";
  scope: "organization" | "campaign";
  campaignId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntelligenceOverview {
  summary: string | null;
  insights: IntelligenceRecord[];
  recommendations: IntelligenceRecord[];
  generatedAt: string | null;
  period: { from: string; to: string } | null;
  dataAvailability: DataAvailability | null;
  hasGeneration: boolean;
  platformsAnalyzed?: string[];
  campaignsAnalyzed?: number;
}

export interface GenerateIntelligenceResult {
  overview: IntelligenceOverview;
  analysisContext: IntelligenceAnalysisContext;
}
