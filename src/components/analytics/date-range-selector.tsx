"use client";

import { cn } from "@/lib/utils";
import type { PresetRange } from "@/lib/analytics/date-range";

const PRESETS: Array<{ id: PresetRange; label: string }> = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
];

interface DateRangeSelectorProps {
  preset: PresetRange;
  customFrom: string;
  customTo: string;
  onPresetChange: (preset: PresetRange) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
}

export function DateRangeSelector({
  preset,
  customFrom,
  customTo,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
}: DateRangeSelectorProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-wrap gap-1 rounded-md border border-border/70 p-1">
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPresetChange(item.id)}
            className={cn(
              "rounded px-3 py-1.5 text-xs font-medium transition-colors",
              preset === item.id
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPresetChange("custom")}
          className={cn(
            "rounded px-3 py-1.5 text-xs font-medium transition-colors",
            preset === "custom"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Custom
        </button>
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap gap-2">
          <label className="text-xs text-muted-foreground">
            From
            <input
              type="date"
              value={customFrom}
              onChange={(event) => onCustomFromChange(event.target.value)}
              className="mt-1 block rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            To
            <input
              type="date"
              value={customTo}
              onChange={(event) => onCustomToChange(event.target.value)}
              className="mt-1 block rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
        </div>
      )}
    </div>
  );
}
