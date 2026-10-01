import type { UsageMetric } from "@/lib/billing/types";
import { BillingSection } from "@/components/billing/billing-section";

interface UsageSummaryProps {
  metrics: UsageMetric[];
}

export function UsageSummary({ metrics }: UsageSummaryProps) {
  if (metrics.length === 0) return null;

  return (
    <BillingSection
      title="Usage & entitlements"
      description="Live usage against limits for your current plan."
    >
      <div className="rounded-md border border-border/60 px-4 py-4 sm:px-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.key}
              className="rounded-md border border-border/50 px-3 py-3"
            >
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {metric.display}
              </p>
            </div>
          ))}
        </div>
      </div>
    </BillingSection>
  );
}
