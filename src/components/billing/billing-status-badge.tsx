import { cn } from "@/lib/utils";
import {
  statusTone,
  subscriptionStatusLabel,
} from "@/lib/billing/display";
import type { SubscriptionInfo } from "@/lib/billing/types";

const toneClasses: Record<
  ReturnType<typeof statusTone>,
  string
> = {
  neutral: "border-border/60 bg-secondary/20 text-muted-foreground",
  positive: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200/90",
  warning: "border-amber-500/25 bg-amber-500/10 text-amber-200/90",
  negative: "border-red-500/25 bg-red-500/10 text-red-200/90",
};

export function BillingStatusBadge({
  subscription,
  className,
}: {
  subscription: SubscriptionInfo;
  className?: string;
}) {
  const tone = statusTone(subscription.status);
  const label = subscriptionStatusLabel(subscription.status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
        toneClasses[tone],
        className
      )}
    >
      <span className="sr-only">Subscription status:</span>
      {label}
    </span>
  );
}
