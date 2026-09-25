import type { PLAN_IDS } from "./plans";

export type PlanId = (typeof PLAN_IDS)[number];

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export type EntitlementFeature =
  | "ai_generation"
  | "growth_intelligence"
  | "advanced_analytics"
  | "social_accounts"
  | "scheduled_posts"
  | "campaigns";

export interface PlanEntitlements {
  aiGenerationsPerMonth: number | null;
  socialAccounts: number | null;
  scheduledPostsPerMonth: number | null;
  campaigns: number | null;
  teamMembers: number | null;
  growthIntelligence: boolean;
  advancedAnalytics: boolean;
}

export interface PublicPlan {
  id: PlanId;
  name: string;
  description: string;
  priceLabel: string;
  priceAmount: number;
  currency: string;
  interval: "month";
  highlighted: boolean;
  features: string[];
  stripeConfigured: boolean;
}

export interface SubscriptionInfo {
  plan: PlanId;
  status: SubscriptionStatus | "free";
  effectivePlan: PlanId;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  hasStripeSubscription: boolean;
}

export interface UsageMetric {
  key: string;
  label: string;
  used: number;
  limit: number | null;
  display: string;
}

export interface BillingUsage {
  metrics: UsageMetric[];
}
