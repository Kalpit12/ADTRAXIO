"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DashboardSectionHeader,
  DashboardSurface,
} from "@/components/dashboard/dashboard-panel";
import { cn } from "@/lib/utils";
import type { PerformanceRange, PerformanceSeriesPoint } from "@/lib/dashboard/types";

const RANGES: PerformanceRange[] = ["7d", "30d", "90d"];

const METRIC_TABS = [
  { id: "reach", label: "Reach" },
  { id: "engagement", label: "Engagement" },
  { id: "clicks", label: "Clicks" },
] as const;

interface PerformanceChartProps {
  hasData: boolean;
  series: PerformanceSeriesPoint[];
}

export function PerformanceChart({ hasData, series }: PerformanceChartProps) {
  const [range, setRange] = useState<PerformanceRange>("30d");
  const [activeMetric, setActiveMetric] =
    useState<(typeof METRIC_TABS)[number]["id"]>("reach");

  const filteredSeries = useMemo(() => {
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    return series.slice(-days);
  }, [range, series]);

  const chartValues = filteredSeries.map((point) => point[activeMetric]);
  const hasChartData = chartValues.some((value) => value > 0);

  return (
    <DashboardSurface className="p-5 sm:p-6 lg:p-7">
      <DashboardSectionHeader
        title="Performance"
        description="Track how your content and campaigns are performing."
        action={
          <div className="flex gap-1 rounded-md border border-border/70 p-1">
            {RANGES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRange(item)}
                className={cn(
                  "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                  range === item
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item}
              </button>
            ))}
          </div>
        }
      />

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-border/60 pb-4">
        {METRIC_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveMetric(tab.id)}
            className={cn(
              "shrink-0 rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
              activeMetric === tab.id
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-5 min-h-[260px] lg:min-h-[300px]">
        {!hasData || !hasChartData ? (
          <div className="flex h-[260px] flex-col items-center justify-center px-6 text-center lg:h-[300px]">
            <BarChart3 className="size-6 text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-4 max-w-md text-base font-medium text-foreground">
              No performance data yet.
            </p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Publish content and connect your accounts to start tracking results.
            </p>
            <div className="mt-5 flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/social">Connect account</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/analytics">View analytics</Link>
              </Button>
            </div>
          </div>
        ) : (
          <PerformanceSvg metric={activeMetric} values={chartValues} />
        )}
      </div>
    </DashboardSurface>
  );
}

function PerformanceSvg({
  metric,
  values,
}: {
  metric: string;
  values: number[];
}) {
  const width = 400;
  const height = 180;
  const max = Math.max(...values, 1);
  const step = width / Math.max(values.length - 1, 1);

  const coords = values.map((value, index) => ({
    x: index * step,
    y: height - (value / max) * (height - 20) - 10,
  }));

  const linePath = coords
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-[260px] w-full lg:h-[300px]"
      aria-hidden
    >
      <defs>
        <linearGradient id={`perf-${metric}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.82 0.17 128 / 15%)" />
          <stop offset="100%" stopColor="oklch(0.82 0.17 128 / 0%)" />
        </linearGradient>
      </defs>
      {[40, 80, 120, 160].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2={width}
          y2={y}
          stroke="oklch(1 0 0 / 5%)"
          strokeWidth="1"
        />
      ))}
      <path d={areaPath} fill={`url(#perf-${metric})`} />
      <path
        d={linePath}
        fill="none"
        stroke="oklch(0.82 0.17 128)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
