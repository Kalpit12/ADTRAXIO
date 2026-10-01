"use client";

import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { cn } from "@/lib/utils";

export type PlatformFilter = "all" | "instagram" | "facebook";

const OPTIONS: Array<{
  id: PlatformFilter;
  label: string;
  platform?: "instagram" | "facebook";
}> = [
  { id: "all", label: "All platforms" },
  { id: "instagram", label: "Instagram", platform: "instagram" },
  { id: "facebook", label: "Facebook", platform: "facebook" },
];

interface PlatformFilterControlProps {
  value: PlatformFilter;
  available: Set<"instagram" | "facebook">;
  onChange: (value: PlatformFilter) => void;
}

export function PlatformFilterControl({
  value,
  available,
  onChange,
}: PlatformFilterControlProps) {
  return (
    <div
      className="flex flex-wrap gap-1 rounded-md border border-border/70 bg-adtraxio-surface/15 p-1"
      role="group"
      aria-label="Filter by platform"
    >
      {OPTIONS.map((option) => {
        if (
          option.id !== "all" &&
          option.platform &&
          !available.has(option.platform)
        ) {
          return null;
        }

        const active = value === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-white/[0.06] text-foreground ring-1 ring-adtraxio-accent/25"
                : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
            )}
            aria-pressed={active}
          >
            {option.platform && (
              <PlatformIcon platform={option.platform} size="sm" />
            )}
            <span className="hidden sm:inline">{option.label}</span>
            <span className="sm:hidden">
              {option.id === "all" ? "All" : option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
