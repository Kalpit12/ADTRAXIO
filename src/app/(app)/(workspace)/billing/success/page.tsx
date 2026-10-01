"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BillingStatusBadge } from "@/components/billing/billing-status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  planDisplayName,
  subscriptionStatusLabel,
} from "@/lib/billing/display";
import type { SubscriptionInfo } from "@/lib/billing/types";

export default function BillingSuccessPage() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing/subscription")
      .then((res) => res.json())
      .then((data: { subscription?: SubscriptionInfo }) => {
        setSubscription(data.subscription ?? null);
      })
      .catch(() => {
        setSubscription(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-lg space-y-8 py-4">
      <PageHeader
        eyebrow="Billing"
        title="Checkout complete"
        description="Your payment is being confirmed. This can take a moment — refresh billing to see your updated plan once it is active."
      />

      {!loading && subscription && (
        <div
          className="rounded-md border border-border/60 px-4 py-4"
          role="status"
          aria-live="polite"
        >
          <p className="text-xs text-muted-foreground">Current entitlement</p>
          <p className="mt-2 font-medium text-foreground">
            {planDisplayName(subscription.effectivePlan)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <BillingStatusBadge subscription={subscription} />
            <span className="text-sm text-muted-foreground">
              {subscriptionStatusLabel(subscription.status)}
            </span>
          </div>
        </div>
      )}

      <Button asChild size="sm">
        <Link href="/billing">Back to billing</Link>
      </Button>
    </div>
  );
}
