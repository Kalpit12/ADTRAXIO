"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicPlan } from "@/lib/billing/types";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  plan: PublicPlan;
  currentPlanId: string;
  loading?: boolean;
  onSelect: (planId: string) => void;
}

export function PlanCard({
  plan,
  currentPlanId,
  loading = false,
  onSelect,
}: PlanCardProps) {
  const isCurrent = plan.id === currentPlanId;
  const isFree = plan.id === "free";

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-md border p-5 transition-colors motion-reduce:transition-none",
        isCurrent
          ? "border-adtraxio-accent/35 bg-adtraxio-accent/[0.04]"
          : "border-border/60",
        plan.highlighted && !isCurrent && "border-border/70"
      )}
    >
      <div>
        <p className="text-sm font-medium text-foreground">{plan.name}</p>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-2xl font-semibold tracking-tight">
            {plan.priceLabel}
          </span>
          <span className="text-sm text-muted-foreground">/month</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
      </div>

      <ul className="mt-5 flex-1 space-y-2.5">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <Check className="mt-0.5 size-3.5 shrink-0 text-adtraxio-accent" />
            {feature}
          </li>
        ))}
      </ul>

      <Button
        size="sm"
        className="mt-6 w-full"
        variant={plan.highlighted ? "default" : "outline"}
        disabled={loading || isCurrent || (isFree && currentPlanId !== "free")}
        onClick={() => onSelect(plan.id)}
      >
        {loading
          ? "Redirecting to checkout…"
          : isCurrent
            ? "Current plan"
            : isFree
              ? "Included"
              : plan.stripeConfigured
                ? "Upgrade"
                : "Unavailable"}
      </Button>
    </div>
  );
}
