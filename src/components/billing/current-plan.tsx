"use client";

import { BillingStatus } from "@/components/billing/billing-status";
import { BillingStatusBadge } from "@/components/billing/billing-status-badge";
import { Button } from "@/components/ui/button";
import {
  planDisplayName,
  subscriptionStatusHint,
} from "@/lib/billing/display";
import type { PublicPlan, SubscriptionInfo } from "@/lib/billing/types";

interface CurrentPlanProps {
  subscription: SubscriptionInfo;
  planDetails?: PublicPlan | null;
  billingAvailable: boolean;
  portalLoading: boolean;
  checkoutBusy: boolean;
  onManageBilling: () => void;
}

export function CurrentPlan({
  subscription,
  planDetails,
  billingAvailable,
  portalLoading,
  checkoutBusy,
  onManageBilling,
}: CurrentPlanProps) {
  const hint = subscriptionStatusHint(subscription);
  const priceLabel = planDetails?.priceLabel ?? "—";
  const cadence = planDetails?.interval === "month" ? "Monthly" : "—";

  return (
    <article
      className="rounded-md border border-border/60 bg-secondary/5 px-4 py-5 sm:px-6 sm:py-6"
      aria-label={`Current plan: ${planDisplayName(subscription.effectivePlan)}`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <BillingStatusBadge subscription={subscription} />
          </div>
          <div>
            <p className="font-heading text-2xl tracking-tight text-foreground sm:text-3xl">
              {planDisplayName(subscription.effectivePlan)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{priceLabel}</span>
              {planDetails && planDetails.priceAmount > 0 && (
                <span> · billed {cadence.toLowerCase()}</span>
              )}
            </p>
          </div>
          {subscription.cancelAtPeriodEnd && (
            <p className="text-sm text-amber-200/90" role="status">
              Scheduled to cancel at the end of the current billing period.
            </p>
          )}
          {hint && (
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              {hint}
            </p>
          )}
        </div>
        {billingAvailable && subscription.hasStripeSubscription && (
          <Button
            size="sm"
            variant="outline"
            disabled={portalLoading || checkoutBusy}
            onClick={onManageBilling}
            className="shrink-0"
          >
            {portalLoading ? "Opening…" : "Manage billing"}
          </Button>
        )}
      </div>
      <div className="mt-6 border-t border-border/50 pt-5">
        <BillingStatus subscription={subscription} planDetails={planDetails} />
      </div>
    </article>
  );
}
