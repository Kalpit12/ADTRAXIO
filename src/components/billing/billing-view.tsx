"use client";

import { useCallback, useEffect, useState } from "react";
import { CurrentPlan } from "@/components/billing/current-plan";
import { PlanCard } from "@/components/billing/plan-card";
import { UsageSummary } from "@/components/billing/usage-summary";
import type { PublicPlan, SubscriptionInfo, UsageMetric } from "@/lib/billing/types";

export function BillingView() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [usage, setUsage] = useState<UsageMetric[]>([]);
  const [billingAvailable, setBillingAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [subRes, plansRes, usageRes] = await Promise.all([
        fetch("/api/billing/subscription"),
        fetch("/api/billing/plans"),
        fetch("/api/billing/usage"),
      ]);

      const subPayload = (await subRes.json()) as {
        subscription?: SubscriptionInfo;
        billingAvailable?: boolean;
        error?: string;
      };
      const plansPayload = (await plansRes.json()) as {
        plans?: PublicPlan[];
        billingAvailable?: boolean;
      };
      const usagePayload = (await usageRes.json()) as {
        usage?: { metrics: UsageMetric[] };
      };

      if (!subRes.ok) {
        setError(subPayload.error ?? "Unable to load billing.");
        return;
      }

      setSubscription(subPayload.subscription ?? null);
      setPlans(plansPayload.plans ?? []);
      setUsage(usagePayload.usage?.metrics ?? []);
      setBillingAvailable(
        Boolean(subPayload.billingAvailable ?? plansPayload.billingAvailable)
      );
    } catch {
      setError("Unable to load billing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  async function handleCheckout(planId: string) {
    if (planId === "free") return;

    setCheckoutPlan(planId);
    setError(null);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Unable to start checkout.");
        return;
      }

      window.location.href = payload.url;
    } catch {
      setError("Unable to start checkout.");
    } finally {
      setCheckoutPlan(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Unable to open billing portal.");
        return;
      }

      window.location.href = payload.url;
    } catch {
      setError("Unable to open billing portal.");
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-lg bg-secondary/30" />
        <div className="h-48 animate-pulse rounded-lg bg-secondary/30" />
      </div>
    );
  }

  const currentPlanId = subscription?.effectivePlan ?? "free";

  return (
    <div className="space-y-10">
      <header className="border-b border-border/60 pb-6">
        <p className="text-xs font-medium text-muted-foreground">Billing</p>
        <h1 className="font-heading mt-1 text-3xl tracking-tight text-foreground sm:text-4xl">
          Manage your ADTRAXIO subscription
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Simple pricing in Kenyan Shillings. Upgrade when you need more capacity.
        </p>
      </header>

      {error && (
        <p className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {!billingAvailable && (
        <p className="text-sm text-muted-foreground">
          Paid checkout is not configured yet. Set Stripe environment variables to
          enable subscriptions.
        </p>
      )}

      {subscription && (
        <CurrentPlan
          subscription={subscription}
          billingAvailable={billingAvailable}
          portalLoading={portalLoading}
          onManageBilling={handlePortal}
        />
      )}

      <UsageSummary metrics={usage} />

      <section className="space-y-4 border-t border-border/60 pt-10">
        <h2 className="text-sm font-medium text-foreground">Plans</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlanId={currentPlanId}
              loading={checkoutPlan === plan.id}
              onSelect={handleCheckout}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
