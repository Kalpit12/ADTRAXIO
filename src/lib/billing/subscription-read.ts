import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveEffectivePlan } from "./access-policy";
import type { PlanId, SubscriptionInfo } from "./types";

type SubscriptionRow = {
  id: string;
  organization_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
};

export function mapSubscription(row: SubscriptionRow | null): SubscriptionInfo {
  if (!row) {
    return {
      plan: "free",
      status: "free",
      effectivePlan: "free",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      trialStart: null,
      trialEnd: null,
      hasStripeSubscription: false,
    };
  }

  const plan = row.plan as PlanId;
  const effectivePlan = resolveEffectivePlan(
    plan,
    row.status,
    row.current_period_end
  );

  return {
    plan,
    status: row.status as SubscriptionInfo["status"],
    effectivePlan,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    canceledAt: row.canceled_at,
    trialStart: row.trial_start,
    trialEnd: row.trial_end,
    hasStripeSubscription: Boolean(row.stripe_subscription_id),
  };
}

export async function getSubscriptionForOrganization(
  supabase: SupabaseClient,
  organizationId: string
): Promise<SubscriptionInfo> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") {
      return mapSubscription(null);
    }
    throw new Error(error.message);
  }

  return mapSubscription(data as SubscriptionRow | null);
}

export async function getEffectivePlan(
  supabase: SupabaseClient,
  organizationId: string
): Promise<PlanId> {
  const subscription = await getSubscriptionForOrganization(
    supabase,
    organizationId
  );
  return subscription.effectivePlan;
}
