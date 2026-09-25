import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { BillingError } from "./errors";
import {
  getEffectivePlan,
  getSubscriptionForOrganization,
  mapSubscription,
} from "./subscription-read";
import {
  isPaidPlan,
  parsePlanIdentifier,
  planFromStripePriceId,
  stripePriceIdForPlan,
} from "./plans";
import { getAppUrl, getStripe, isStripeConfigured } from "./stripe";
import { getOrganizationEntitlements } from "./entitlements";
import type { BillingUsage, PlanId, UsageMetric } from "./types";

export async function getOrCreateStripeCustomer(
  supabase: SupabaseClient,
  organizationId: string,
  email?: string | null
): Promise<string> {
  const { data: existing } = await supabase
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id as string;
  }

  if (!isStripeConfigured()) {
    throw new BillingError("Stripe is not configured.", "STRIPE_NOT_CONFIGURED", 503);
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: { organization_id: organizationId },
  });

  const admin = createAdminClient();
  if (!admin) {
    throw new BillingError("Unable to persist billing customer.", "DATABASE_ERROR", 500);
  }

  const { error } = await admin.from("billing_customers").insert({
    organization_id: organizationId,
    stripe_customer_id: customer.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  return customer.id;
}

export async function createCheckoutSession(input: {
  supabase: SupabaseClient;
  organizationId: string;
  userEmail?: string | null;
  plan: PlanId;
}): Promise<{ url: string }> {
  if (!isPaidPlan(input.plan)) {
    throw new BillingError("Free plan does not require checkout.", "INVALID_PLAN");
  }

  const priceId = stripePriceIdForPlan(input.plan);
  if (!priceId) {
    throw new BillingError(
      "This plan is not available for checkout yet.",
      "PRICE_NOT_CONFIGURED",
      503
    );
  }

  const customerId = await getOrCreateStripeCustomer(
    input.supabase,
    input.organizationId,
    input.userEmail
  );

  const stripe = getStripe();
  const appUrl = getAppUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/billing/cancel`,
    subscription_data: {
      metadata: {
        organization_id: input.organizationId,
        plan: input.plan,
      },
    },
    metadata: {
      organization_id: input.organizationId,
      plan: input.plan,
    },
  });

  if (!session.url) {
    throw new BillingError("Unable to create checkout session.", "CHECKOUT_FAILED", 500);
  }

  return { url: session.url };
}

export async function createPortalSession(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ url: string }> {
  const customerId = await getOrCreateStripeCustomer(supabase, organizationId);
  const stripe = getStripe();
  const appUrl = getAppUrl();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/billing`,
  });

  if (!session.url) {
    throw new BillingError("Unable to open billing portal.", "PORTAL_FAILED", 500);
  }

  return { url: session.url };
}

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function recordUsageEvent(
  organizationId: string,
  metric: "ai_generation"
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  await admin.from("billing_usage_events").insert({
    organization_id: organizationId,
    metric,
  });
}

export async function getBillingUsage(
  supabase: SupabaseClient,
  organizationId: string
): Promise<BillingUsage> {
  const { entitlements } = await getOrganizationEntitlements(
    supabase,
    organizationId
  );

  const monthStart = monthStartIso();

  const [
    { count: aiCount },
    { count: socialCount },
    { count: scheduledCount },
    { count: campaignCount },
    { count: teamCount },
  ] = await Promise.all([
    supabase
      .from("billing_usage_events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("metric", "ai_generation")
      .gte("created_at", monthStart),
    supabase
      .from("social_accounts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "connected"),
    supabase
      .from("scheduled_posts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "scheduled")
      .gte("created_at", monthStart),
    supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .neq("status", "archived"),
    supabase
      .from("organization_members")
      .select("user_id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
  ]);

  function formatMetric(
    key: string,
    label: string,
    used: number,
    limit: number | null
  ): UsageMetric {
    return {
      key,
      label,
      used,
      limit,
      display: limit == null ? `${used} / Unlimited` : `${used} / ${limit}`,
    };
  }

  return {
    metrics: [
      formatMetric(
        "ai_generation",
        "AI generations",
        aiCount ?? 0,
        entitlements.aiGenerationsPerMonth
      ),
      formatMetric(
        "social_accounts",
        "Connected accounts",
        socialCount ?? 0,
        entitlements.socialAccounts
      ),
      formatMetric(
        "scheduled_posts",
        "Scheduled posts",
        scheduledCount ?? 0,
        entitlements.scheduledPostsPerMonth
      ),
      formatMetric(
        "campaigns",
        "Campaigns",
        campaignCount ?? 0,
        entitlements.campaigns
      ),
      formatMetric(
        "team_members",
        "Team members",
        teamCount ?? 0,
        entitlements.teamMembers
      ),
    ],
  };
}

export async function upsertSubscriptionFromStripe(
  organizationId: string,
  subscription: Stripe.Subscription
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable.");

  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const plan =
    (subscription.metadata?.plan as PlanId | undefined) ??
    planFromStripePriceId(priceId);

  const primaryItem = subscription.items.data[0];
  const periodStart = primaryItem?.current_period_start ?? null;
  const periodEnd = primaryItem?.current_period_end ?? null;

  const row = {
    organization_id: organizationId,
    stripe_customer_id:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    plan,
    status: subscription.status,
    current_period_start: periodStart
      ? new Date(periodStart * 1000).toISOString()
      : null,
    current_period_end: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
    trial_start: subscription.trial_start
      ? new Date(subscription.trial_start * 1000).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
  };

  const { data: existing } = await admin
    .from("subscriptions")
    .select("id")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await admin
      .from("subscriptions")
      .update(row)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin.from("subscriptions").insert(row);
    if (error) throw new Error(error.message);
  }
}

export async function markSubscriptionCanceled(organizationId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  await admin
    .from("subscriptions")
    .update({
      plan: "free",
      status: "canceled",
      stripe_subscription_id: null,
      stripe_price_id: null,
    })
    .eq("organization_id", organizationId);
}

export {
  parsePlanIdentifier,
  isStripeConfigured,
  getSubscriptionForOrganization,
  getEffectivePlan,
  mapSubscription,
};
