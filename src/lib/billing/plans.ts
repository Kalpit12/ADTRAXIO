import type { PlanEntitlements, PlanId, PublicPlan } from "./types";

export const PLAN_IDS = ["free", "pro", "agency"] as const;

export const CURRENCY = "KES";

/** Display pricing — Stripe Price IDs must match these amounts in KES. */
export const PLAN_PRICING: Record<
  PlanId,
  { amount: number; label: string; name: string; description: string }
> = {
  free: {
    amount: 0,
    label: "KES 0",
    name: "Free",
    description: "Get started with core tools.",
  },
  pro: {
    amount: 2499,
    label: "KES 2,499",
    name: "Pro",
    description: "For creators ready to grow organically.",
  },
  agency: {
    amount: 7499,
    label: "KES 7,499",
    name: "Agency",
    description: "For brands and teams managing multiple channels.",
  },
};

export const PLAN_ENTITLEMENTS: Record<PlanId, PlanEntitlements> = {
  free: {
    aiGenerationsPerMonth: 5,
    socialAccounts: 1,
    scheduledPostsPerMonth: 10,
    campaigns: 2,
    teamMembers: 1,
    growthIntelligence: false,
    advancedAnalytics: false,
  },
  pro: {
    aiGenerationsPerMonth: null,
    socialAccounts: 3,
    scheduledPostsPerMonth: null,
    campaigns: null,
    teamMembers: 3,
    growthIntelligence: true,
    advancedAnalytics: true,
  },
  agency: {
    aiGenerationsPerMonth: null,
    socialAccounts: null,
    scheduledPostsPerMonth: null,
    campaigns: null,
    teamMembers: 10,
    growthIntelligence: true,
    advancedAnalytics: true,
  },
};

export const PLAN_FEATURES: Record<PlanId, string[]> = {
  free: [
    "1 social account",
    "5 AI content generations / month",
    "2 campaigns",
    "10 scheduled posts / month",
    "Basic analytics",
  ],
  pro: [
    "3 social accounts",
    "Unlimited AI content",
    "Unlimited campaigns & scheduling",
    "Advanced analytics",
    "Growth Intelligence",
  ],
  agency: [
    "Unlimited social accounts",
    "Unlimited AI content",
    "Team workspace (up to 10 members)",
    "Advanced analytics",
    "Growth Intelligence",
    "Priority support",
  ],
};

export function stripePriceIdForPlan(plan: PlanId): string | null {
  if (plan === "free") return null;
  if (plan === "pro") return process.env.STRIPE_PRICE_PRO?.trim() || null;
  if (plan === "agency") return process.env.STRIPE_PRICE_AGENCY?.trim() || null;
  return null;
}

export function planFromStripePriceId(priceId: string | null | undefined): PlanId {
  if (!priceId) return "free";
  const pro = process.env.STRIPE_PRICE_PRO?.trim();
  const agency = process.env.STRIPE_PRICE_AGENCY?.trim();
  if (priceId === agency) return "agency";
  if (priceId === pro) return "pro";
  return "pro";
}

export function isPaidPlan(plan: PlanId): boolean {
  return plan === "pro" || plan === "agency";
}

export function getPublicPlans(): PublicPlan[] {
  return PLAN_IDS.map((id) => ({
    id,
    name: PLAN_PRICING[id].name,
    description: PLAN_PRICING[id].description,
    priceLabel: PLAN_PRICING[id].label,
    priceAmount: PLAN_PRICING[id].amount,
    currency: CURRENCY,
    interval: "month" as const,
    highlighted: id === "pro",
    features: PLAN_FEATURES[id],
    stripeConfigured: id === "free" || Boolean(stripePriceIdForPlan(id)),
  }));
}

export function parsePlanIdentifier(value: unknown): PlanId | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (PLAN_IDS.includes(normalized as PlanId)) {
    return normalized as PlanId;
  }
  return null;
}
