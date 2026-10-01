"use client";

import { useCallback, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  formatChartValue,
  formatFullDate,
  formatShortDate,
} from "@/lib/analytics/display";
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
  const metricLabel =
    METRICS.find((m) => m.id === activeMetric)?.label ?? "Metric";

  const values = series
    .map((point) => point[activeMetric])
    .filter((value): value is number => value != null);

  const hasEnoughData = values.length >= 2;

  return (
    <section
      className="rounded-lg border border-border/60 bg-adtraxio-surface/10"
      aria-labelledby="analytics-trend-title"
    >
      <div className="flex flex-col gap-4 border-b border-border/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
            Trends
          </p>
          <h2
            id="analytics-trend-title"
            className="font-heading text-lg tracking-tight text-foreground sm:text-xl"
          >
            Performance over time
          </h2>
        </div>
        <div
          className="flex gap-1 overflow-x-auto rounded-md border border-border/60 p-1"
          role="tablist"
          aria-label="Chart metric"
        >
          {METRICS.map((metric) => (
            <button
              key={metric.id}
              type="button"
              role="tab"
              aria-selected={activeMetric === metric.id}
              onClick={() => onMetricChange(metric.id)}
              className={cn(
                "shrink-0 rounded px-3 py-1.5 text-xs font-medium transition-colors",
                activeMetric === metric.id
                  ? "bg-white/[0.06] text-foreground ring-1 ring-adtraxio-accent/20"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {metric.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6 sm:py-6">
        {!hasEnoughData ? (
          <div
            className="flex min-h-[260px] flex-col items-center justify-center rounded-md border border-dashed border-border/60 px-4 text-center"
          >
            <p className="text-sm font-medium text-foreground">
              Not enough data for a trend
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Sync analytics after publishing, or widen the date range. Unavailable
              days are excluded — not counted as zero.
            </p>
          </div>
        ) : (
          <InteractiveTrendChart
            series={series}
            activeMetric={activeMetric}
            metricLabel={metricLabel}
          />
        )}
      </div>
    </section>
  );
}

function InteractiveTrendChart({
  series,
  activeMetric,
  metricLabel,
}: {
  series: AnalyticsPerformanceChartProps["series"];
  activeMetric: ChartMetric;
  metricLabel: string;
}) {
  const reduceMotion = useReducedMotion();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = useMemo(
    () =>
      series.map((point) => ({
        date: point.date,
        value: point[activeMetric],
      })),
    [series, activeMetric]
  );

  const numericValues = points
    .map((p) => p.value)
    .filter((v): v is number => v != null);
  const max = Math.max(...numericValues, 1);
  const width = 640;
  const height = 220;
  const padX = 8;
  const padY = 16;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const step = chartW / Math.max(points.length - 1, 1);

  const coords = points.map((point, index) => {
    const x = padX + index * step;
    const y =
      point.value == null
        ? null
        : padY + chartH - (point.value / max) * chartH;
    return { x, y, ...point };
  });

  const lineSegments = useMemo(() => {
    const segments: string[] = [];
    let segment: Array<{ x: number; y: number }> = [];

    coords.forEach((point) => {
      if (point.y == null) {
        if (segment.length > 0) {
          segments.push(
            segment
              .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
              .join(" ")
          );
          segment = [];
        }
        return;
      }
      segment.push({ x: point.x, y: point.y });
    });

    if (segment.length > 0) {
      segments.push(
        segment
          .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
          .join(" ")
      );
    }

    return segments;
  }, [coords]);

  const handlePointer = useCallback(
    (clientX: number, rect: DOMRect) => {
      const relative = clientX - rect.left;
      const ratio = Math.min(Math.max(relative / rect.width, 0), 1);
      const index = Math.round(ratio * (points.length - 1));
      setHoverIndex(index);
    },
    [points.length]
  );

  const activePoint = hoverIndex != null ? coords[hoverIndex] : null;

  const yTicks = [0, 0.5, 1].map((t) => ({
    y: padY + chartH * (1 - t),
    label: Math.round(max * t).toLocaleString(),
  }));

  return (
    <div className="relative">
      <div
        className="relative touch-pan-y"
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={(e) =>
          handlePointer(e.clientX, e.currentTarget.getBoundingClientRect())
        }
        onTouchStart={(e) => {
          const touch = e.touches[0];
          if (touch) {
            handlePointer(
              touch.clientX,
              e.currentTarget.getBoundingClientRect()
            );
          }
        }}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          if (touch) {
            handlePointer(
              touch.clientX,
              e.currentTarget.getBoundingClientRect()
            );
          }
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[260px] w-full select-none"
          role="img"
          aria-label={`${metricLabel} trend chart`}
        >
          {yTicks.map((tick) => (
            <g key={tick.y}>
              <line
                x1={padX}
                y1={tick.y}
                x2={width - padX}
                y2={tick.y}
                stroke="oklch(1 0 0 / 6%)"
                strokeWidth="1"
              />
              <text
                x={padX}
                y={tick.y - 4}
                className="fill-muted-foreground text-[9px]"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {lineSegments.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="oklch(0.82 0.17 128)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={reduceMotion ? undefined : "transition-opacity duration-200"}
            />
          ))}

          {coords.map((point, index) =>
            point.y != null ? (
              <circle
                key={point.date}
                cx={point.x}
                cy={point.y}
                r={hoverIndex === index ? 4 : 2.5}
                fill="oklch(0.82 0.17 128)"
                className={reduceMotion ? undefined : "transition-all duration-150"}
              />
            ) : null
          )}

          {activePoint?.y != null && (
            <line
              x1={activePoint.x}
              y1={padY}
              x2={activePoint.x}
              y2={padY + chartH}
              stroke="oklch(1 0 0 / 12%)"
              strokeDasharray="3 3"
            />
          )}
        </svg>

        {activePoint && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-[10rem] rounded-md border border-border/80 bg-background/95 px-3 py-2 text-xs shadow-sm backdrop-blur-sm"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            <p className="font-medium text-foreground">
              {formatFullDate(activePoint.date)}
            </p>
            <p className="mt-1 text-muted-foreground">{metricLabel}</p>
            <p className="mt-0.5 tabular-nums text-sm text-foreground">
              {formatChartValue(activePoint.value)}
            </p>
          </div>
        )}
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>{formatShortDate(points[0]?.date ?? "")}</span>
        <span>{formatShortDate(points[points.length - 1]?.date ?? "")}</span>
      </div>
    </div>
  );
}
