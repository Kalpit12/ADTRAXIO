"use client";

import { cn } from "@/lib/utils";

type ChartMetric = "impressions" | "reach" | "engagement";

const METRICS: Array<{ id: ChartMetric; label: string }> = [
  { id: "impressions", label: "Impressions" },
  { id: "reach", label: "Reach" },
  { id: "engagement", label: "Engagement" },
];

interface AnalyticsPerformanceChartProps {
  series: Array<{
    date: string;
    impressions: number | null;
    reach: number | null;
    engagement: number | null;
  }>;
  activeMetric: ChartMetric;
  onMetricChange: (metric: ChartMetric) => void;
}

export function AnalyticsPerformanceChart({
  series,
  activeMetric,
  onMetricChange,
}: AnalyticsPerformanceChartProps) {
  const values = series
    .map((point) => point[activeMetric])
    .filter((value): value is number => value != null);

  const hasEnoughData = values.length >= 2;

  return (
    <section className="rounded-lg border border-border/60 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Performance</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Trend</h2>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {METRICS.map((metric) => (
            <button
              key={metric.id}
              type="button"
              onClick={() => onMetricChange(metric.id)}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                activeMetric === metric.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {metric.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 min-h-[240px]">
        {!hasEnoughData ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            Not enough data yet
          </div>
        ) : (
          <SeriesSvg
            points={series.map((point) => ({
              label: point.date.slice(5),
              value: point[activeMetric],
            }))}
          />
        )}
      </div>
    </section>
  );
}

function SeriesSvg({
  points,
}: {
  points: Array<{ label: string; value: number | null }>;
}) {
  const numeric = points.map((point) => point.value ?? 0);
  const max = Math.max(...numeric, 1);
  const width = 400;
  const height = 180;
  const step = width / Math.max(points.length - 1, 1);

  const coords = points.map((point, index) => {
    const x = index * step;
    const y = height - ((point.value ?? 0) / max) * (height - 20) - 10;
    return { x, y };
  });

  const linePath = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[240px] w-full" aria-hidden>
      <defs>
        <linearGradient id="analytics-area" x1="0" y1="0" x2="0" y2="1">
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
      <path d={areaPath} fill="url(#analytics-area)" />
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
