"use client";

import { cn } from "@/lib/utils";
import type { PresetRange } from "@/lib/analytics/date-range";

const PRESETS: Array<{ id: PresetRange; label: string; short: string }> = [
  { id: "7d", label: "7 days", short: "7d" },
  { id: "30d", label: "30 days", short: "30d" },
  { id: "90d", label: "90 days", short: "90d" },
];

interface DateRangeSelectorProps {
  preset: PresetRange;
  customFrom: string;
  customTo: string;
  onPresetChange: (preset: PresetRange) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  className?: string;
}

export function DateRangeSelector({
  preset,
  customFrom,
  customTo,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
  className,
}: DateRangeSelectorProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        className="flex flex-wrap gap-1 rounded-md border border-border/70 bg-adtraxio-surface/15 p-1"
        role="group"
        aria-label="Date range"
      >
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPresetChange(item.id)}
            className={cn(
              "min-h-9 rounded px-3 py-1.5 text-xs font-medium transition-colors",
              preset === item.id
                ? "bg-white/[0.06] text-foreground ring-1 ring-adtraxio-accent/25"
                : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
            )}
            aria-pressed={preset === item.id}
          >
            <span className="hidden sm:inline">{item.label}</span>
            <span className="sm:hidden">{item.short}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPresetChange("custom")}
          className={cn(
            "min-h-9 rounded px-3 py-1.5 text-xs font-medium transition-colors",
            preset === "custom"
              ? "bg-white/[0.06] text-foreground ring-1 ring-adtraxio-accent/25"
              : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
          )}
          aria-pressed={preset === "custom"}
        >
          Custom
        </button>
      </div>

      {preset === "custom" && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="text-xs text-muted-foreground">
            From
            <input
              type="date"
              value={customFrom}
              onChange={(event) => onCustomFromChange(event.target.value)}
              className="mt-1 block min-h-10 w-full min-w-[10rem] rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-adtraxio-accent/40"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            To
            <input
              type="date"
              value={customTo}
              onChange={(event) => onCustomToChange(event.target.value)}
              className="mt-1 block min-h-10 w-full min-w-[10rem] rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-adtraxio-accent/40"
            />
          </label>
        </div>
      )}
    </div>
  );
}
