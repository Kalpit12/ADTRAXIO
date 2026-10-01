"use client";

import { cn } from "@/lib/utils";

interface VariationSelectorProps {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function VariationSelector({
  count,
  activeIndex,
  onSelect,
}: VariationSelectorProps) {
  if (count <= 1) return null;

  return (
    <div
      className="flex gap-1 overflow-x-auto border-b border-border/50 pb-3"
      role="tablist"
      aria-label="Creative variations"
    >
      {Array.from({ length: count }, (_, index) => {
        const active = index === activeIndex;
        const label = index === 0 ? "Original" : `Variation ${index}`;

        return (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(index)}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-white/[0.06] text-foreground ring-1 ring-adtraxio-accent/25"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
