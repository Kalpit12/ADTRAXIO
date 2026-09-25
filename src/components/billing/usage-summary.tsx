import type { UsageMetric } from "@/lib/billing/types";

interface UsageSummaryProps {
  metrics: UsageMetric[];
}

export function UsageSummary({ metrics }: UsageSummaryProps) {
  if (metrics.length === 0) return null;

  return (
    <section className="rounded-lg border border-border/60 p-5">
      <h2 className="text-sm font-medium text-foreground">Usage</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
    </section>
  );
}
