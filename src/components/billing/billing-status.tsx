import type { SubscriptionInfo } from "@/lib/billing/types";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface BillingStatusProps {
  subscription: SubscriptionInfo;
}

export function BillingStatus({ subscription }: BillingStatusProps) {
  const statusLabel =
    subscription.status === "free"
      ? "Free"
      : subscription.status.replace(/_/g, " ");

  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <dt className="text-xs text-muted-foreground">Plan</dt>
        <dd className="mt-1 text-sm font-medium capitalize text-foreground">
          {subscription.effectivePlan}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Status</dt>
        <dd className="mt-1 text-sm capitalize text-foreground">{statusLabel}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Renewal</dt>
        <dd className="mt-1 text-sm text-foreground">
          {formatDate(subscription.currentPeriodEnd)}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Trial</dt>
        <dd className="mt-1 text-sm text-foreground">
          {subscription.trialEnd
            ? `Until ${formatDate(subscription.trialEnd)}`
            : "—"}
        </dd>
      </div>
    </dl>
  );
}
