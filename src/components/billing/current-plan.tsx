"use client";

import { Button } from "@/components/ui/button";
import { BillingStatus } from "@/components/billing/billing-status";
import type { SubscriptionInfo } from "@/lib/billing/types";

interface CurrentPlanProps {
  subscription: SubscriptionInfo;
  billingAvailable: boolean;
  portalLoading: boolean;
  onManageBilling: () => void;
}

export function CurrentPlan({
  subscription,
  billingAvailable,
  portalLoading,
  onManageBilling,
}: CurrentPlanProps) {
  return (
    <section className="rounded-lg border border-border/60 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-foreground">Current plan</h2>
          {subscription.cancelAtPeriodEnd && (
            <p className="mt-2 text-xs text-amber-300">
              Cancels at end of billing period.
            </p>
          )}
        </div>
        {billingAvailable && subscription.hasStripeSubscription && (
          <Button
            size="sm"
            variant="outline"
            disabled={portalLoading}
            onClick={onManageBilling}
          >
            {portalLoading ? "Opening…" : "Manage billing"}
          </Button>
        )}
      </div>
      <div className="mt-5">
        <BillingStatus subscription={subscription} />
      </div>
    </section>
  );
}
