"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardMetric } from "@/lib/dashboard/types";

interface MetricCardProps {
  metric: DashboardMetric;
}

export function MetricCard({ metric }: MetricCardProps) {
  const positive = (metric.changePercent ?? 0) >= 0;

  return (
    <div className="flex min-h-[120px] flex-col justify-center px-5 py-4 sm:px-6">
      <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>

      {metric.hasData ? (
        <>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {metric.value?.toLocaleString()}
          </p>
          {metric.changePercent != null && (
            <p
              className={cn(
                "mt-2 flex items-center gap-1 text-sm font-medium",
                positive ? "text-adtraxio-accent" : "text-red-400"
              )}
            >
              {positive ? (
                <TrendingUp className="size-3.5" />
              ) : (
                <TrendingDown className="size-3.5" />
              )}
              {positive ? "+" : ""}
              {metric.changePercent}%
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Compared with previous period
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-muted-foreground/35 sm:text-4xl">
            —
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect an account to see data
          </p>
        </>
      )}
    </div>
  );
}
