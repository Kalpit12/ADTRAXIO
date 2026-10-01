"use client";

import { useCallback, useEffect, useState } from "react";
import { BillingActionPanel } from "@/components/billing/billing-action-panel";
import { BillingError } from "@/components/billing/billing-error";
import { BillingPlanComparison } from "@/components/billing/billing-plan-comparison";
import { BillingSection } from "@/components/billing/billing-section";
import { BillingSkeleton } from "@/components/billing/billing-skeleton";
import { CurrentPlan } from "@/components/billing/current-plan";
import { PlanCard } from "@/components/billing/plan-card";
import { UsageSummary } from "@/components/billing/usage-summary";
import { PageHeader } from "@/components/layout/page-header";
import { friendlyBillingError } from "@/lib/billing/display";
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
        setError(friendlyBillingError(subPayload.error ?? "Unable to load billing."));
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
        setError(friendlyBillingError(payload.error ?? "Unable to start checkout."));
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
        setError(
          friendlyBillingError(payload.error ?? "Unable to open billing portal.")
        );
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
    return <BillingSkeleton />;
  }

  const currentPlanId = subscription?.effectivePlan ?? "free";
  const currentPlanDetails =
    plans.find((p) => p.id === currentPlanId) ?? plans.find((p) => p.id === "free");
  const checkoutBusy = checkoutPlan !== null;
  const showBillingManagement =
    billingAvailable && Boolean(subscription?.hasStripeSubscription);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Billing"
        title="Plans & billing"
        description="Manage your ADTRAXIO plan and subscription."
      />

      <div aria-live="polite" className="space-y-4">
        {error && <BillingError message={error} onRetry={loadBilling} />}
      </div>

      {!billingAvailable && (
        <p className="text-sm text-muted-foreground" role="status">
          Paid subscriptions are not available in this environment yet. You can
          still use the Free plan and review what each tier includes below.
        </p>
      )}

      {subscription && (
        <BillingSection title="Current plan">
          <CurrentPlan
            subscription={subscription}
            planDetails={currentPlanDetails}
            billingAvailable={billingAvailable}
            portalLoading={portalLoading}
            checkoutBusy={checkoutBusy}
            onManageBilling={handlePortal}
          />
        </BillingSection>
      )}

      <UsageSummary metrics={usage} />

      <BillingSection
        title="Plans"
        description="Compare tiers. Upgrades open secure checkout; your plan updates after payment is confirmed."
      >
        <BillingPlanComparison plans={plans} currentPlanId={currentPlanId} />
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
      </BillingSection>

      {showBillingManagement && (
        <BillingSection
          title="Billing management"
          description="Invoices, payment method, and subscription changes."
        >
          <BillingActionPanel
            portalLoading={portalLoading}
            checkoutBusy={checkoutBusy}
            onManageBilling={handlePortal}
          />
        </BillingSection>
      )}
    </div>
  );
}
