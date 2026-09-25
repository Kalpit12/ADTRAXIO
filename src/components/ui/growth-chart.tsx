import { cn } from "@/lib/utils";

interface GrowthChartProps {
  className?: string;
  height?: number;
}

export function GrowthChart({ className, height = 80 }: GrowthChartProps) {
  return (
    <svg
      viewBox="0 0 280 80"
      className={cn("w-full", className)}
      style={{ height }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.82 0.17 128 / 25%)" />
          <stop offset="100%" stopColor="oklch(0.82 0.17 128 / 0%)" />
        </linearGradient>
      </defs>
      <path
        d="M0,65 L40,58 L80,62 L120,45 L160,38 L200,28 L240,22 L280,12 L280,80 L0,80 Z"
        fill="url(#chartFill)"
      />
      <path
        d="M0,65 L40,58 L80,62 L120,45 L160,38 L200,28 L240,22 L280,12"
        fill="none"
        stroke="oklch(0.82 0.17 128)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
