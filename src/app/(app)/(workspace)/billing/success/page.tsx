"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { SubscriptionInfo } from "@/lib/billing/types";

export default function BillingSuccessPage() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    fetch("/api/billing/subscription")
      .then((res) => res.json())
      .then((data: { subscription?: SubscriptionInfo }) => {
        setSubscription(data.subscription ?? null);
      })
      .catch(() => {
        setSubscription(null);
      });
  }, []);

  return (
    <div className="mx-auto max-w-lg space-y-6 py-10">
      <header>
        <h1 className="font-heading text-3xl tracking-tight text-foreground">
          Checkout complete
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Your checkout was completed. Your subscription is being confirmed — this
          may take a moment while Stripe processes the payment.
        </p>
      </header>

      {subscription && (
        <div className="rounded-lg border border-border/60 px-4 py-4 text-sm">
          <p className="text-muted-foreground">Current status</p>
          <p className="mt-1 font-medium capitalize text-foreground">
            {subscription.effectivePlan} · {subscription.status}
          </p>
        </div>
      )}

      <Button asChild size="sm">
        <Link href="/billing">Back to billing</Link>
      </Button>
    </div>
  );
}
