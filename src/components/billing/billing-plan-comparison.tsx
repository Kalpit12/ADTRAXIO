import { Check, Minus } from "lucide-react";
import type { PublicPlan } from "@/lib/billing/types";
import { cn } from "@/lib/utils";

interface BillingPlanComparisonProps {
  plans: PublicPlan[];
  currentPlanId: string;
}

export function BillingPlanComparison({
  plans,
  currentPlanId,
}: BillingPlanComparisonProps) {
  if (plans.length === 0) return null;

  const featureSet = new Set<string>();
  for (const plan of plans) {
    for (const feature of plan.features) {
      featureSet.add(feature);
    }
  }
  const rows = Array.from(featureSet);

  return (
    <div className="hidden overflow-x-auto rounded-md border border-border/60 lg:block">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption className="sr-only">Plan feature comparison</caption>
        <thead>
          <tr className="border-b border-border/60">
            <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
              Included
            </th>
            {plans.map((plan) => (
              <th
                key={plan.id}
                scope="col"
                className="px-4 py-3 font-medium text-foreground"
              >
                {plan.name}
                {plan.id === currentPlanId && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (current)
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row} className="border-b border-border/40 last:border-0">
              <th
                scope="row"
                className="px-4 py-2.5 font-normal text-muted-foreground"
              >
                {row}
              </th>
              {plans.map((plan) => {
                const included = plan.features.includes(row);
                return (
                  <td key={plan.id} className="px-4 py-2.5">
                    {included ? (
                      <span className="inline-flex items-center gap-1.5 text-foreground">
                        <Check
                          className="size-3.5 shrink-0 text-adtraxio-accent"
                          aria-hidden
                        />
                        <span className="sr-only">Included in {plan.name}</span>
                      </span>
                    ) : (
                      <Minus
                        className="size-3.5 text-muted-foreground/50"
                        aria-label={`Not included in ${plan.name}`}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="border-t border-border/60 bg-secondary/10">
            <th scope="row" className="px-4 py-3 font-normal text-muted-foreground">
              Price (monthly)
            </th>
            {plans.map((plan) => (
              <td
                key={plan.id}
                className={cn(
                  "px-4 py-3 font-medium text-foreground",
                  plan.id === currentPlanId && "text-adtraxio-accent"
                )}
              >
                {plan.priceLabel}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
