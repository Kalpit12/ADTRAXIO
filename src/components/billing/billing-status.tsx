import {
  planDisplayName,
  subscriptionStatusLabel,
} from "@/lib/billing/display";
import type { PublicPlan, SubscriptionInfo } from "@/lib/billing/types";

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
  planDetails?: PublicPlan | null;
}

export function BillingStatus({
  subscription,
  planDetails,
}: BillingStatusProps) {
  const showTrial = Boolean(subscription.trialEnd);
  const renewalLabel =
    subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd
      ? "Access until"
      : "Next renewal";

  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <dt className="text-xs text-muted-foreground">Entitled plan</dt>
        <dd className="mt-1 text-sm font-medium text-foreground">
          {planDisplayName(subscription.effectivePlan)}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Billing state</dt>
        <dd className="mt-1 text-sm text-foreground">
          {subscriptionStatusLabel(subscription.status)}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">{renewalLabel}</dt>
        <dd className="mt-1 text-sm text-foreground">
          {formatDate(subscription.currentPeriodEnd)}
        </dd>
      </div>
      {showTrial ? (
        <div>
          <dt className="text-xs text-muted-foreground">Trial ends</dt>
          <dd className="mt-1 text-sm text-foreground">
            {formatDate(subscription.trialEnd)}
          </dd>
        </div>
      ) : (
        <div>
          <dt className="text-xs text-muted-foreground">Price</dt>
          <dd className="mt-1 text-sm text-foreground">
            {planDetails?.priceLabel ?? "—"}
            {planDetails && planDetails.priceAmount > 0 ? " / month" : ""}
          </dd>
        </div>
      )}
    </dl>
  );
}
