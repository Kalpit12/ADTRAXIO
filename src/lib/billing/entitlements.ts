import type { SupabaseClient } from "@supabase/supabase-js";
import { PLAN_ENTITLEMENTS } from "./plans";
import { EntitlementError } from "./errors";
import { getEffectivePlan } from "./subscription-read";
import type { EntitlementFeature, PlanEntitlements, PlanId } from "./types";

export function entitlementsForPlan(plan: PlanId): PlanEntitlements {
  return PLAN_ENTITLEMENTS[plan];
}

export async function getOrganizationEntitlements(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ plan: PlanId; entitlements: PlanEntitlements }> {
  const plan = await getEffectivePlan(supabase, organizationId);
  return { plan, entitlements: entitlementsForPlan(plan) };
}

export async function requireEntitlement(
  supabase: SupabaseClient,
  organizationId: string,
  feature: EntitlementFeature
): Promise<{ plan: PlanId; entitlements: PlanEntitlements }> {
  const { plan, entitlements } = await getOrganizationEntitlements(
    supabase,
    organizationId
  );

  switch (feature) {
    case "growth_intelligence":
      if (!entitlements.growthIntelligence) {
        throw new EntitlementError(
          "Growth Intelligence is available on Pro and Agency plans.",
          feature
        );
      }
      break;
    case "advanced_analytics":
      if (!entitlements.advancedAnalytics) {
        throw new EntitlementError(
          "Advanced analytics is available on Pro and Agency plans.",
          feature
        );
      }
      break;
    default:
      break;
  }

  return { plan, entitlements };
}

export async function checkLimit(
  supabase: SupabaseClient,
  organizationId: string,
  feature: EntitlementFeature,
  currentCount: number
): Promise<void> {
  const { entitlements } = await getOrganizationEntitlements(
    supabase,
    organizationId
  );

  let limit: number | null = null;
  let label = "";

  switch (feature) {
    case "ai_generation":
      limit = entitlements.aiGenerationsPerMonth;
      label = "AI content generations";
      break;
    case "social_accounts":
      limit = entitlements.socialAccounts;
      label = "connected social accounts";
      break;
    case "scheduled_posts":
      limit = entitlements.scheduledPostsPerMonth;
      label = "scheduled posts";
      break;
    case "campaigns":
      limit = entitlements.campaigns;
      label = "campaigns";
      break;
    default:
      return;
  }

  if (limit != null && currentCount >= limit) {
    throw new EntitlementError(
      `You've reached your plan limit for ${label}. Upgrade to continue.`,
      feature
    );
  }
}

export async function checkProjectedLimit(
  supabase: SupabaseClient,
  organizationId: string,
  feature: EntitlementFeature,
  projectedCount: number
): Promise<void> {
  const { entitlements } = await getOrganizationEntitlements(
    supabase,
    organizationId
  );

  let limit: number | null = null;
  let label = "";

  switch (feature) {
    case "social_accounts":
      limit = entitlements.socialAccounts;
      label = "connected social accounts";
      break;
    default:
      return;
  }

  if (limit != null && projectedCount > limit) {
    throw new EntitlementError(
      `You've reached your plan limit for ${label}. Upgrade to continue.`,
      feature
    );
  }
}
