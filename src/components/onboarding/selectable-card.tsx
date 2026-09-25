"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectableCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  multi?: boolean;
}

export function SelectableCard({
  title,
  description,
  icon,
  selected,
  onClick,
  multi = false,
}: SelectableCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group relative w-full rounded-lg border p-4 text-left transition-all",
        "hover:border-adtraxio-accent/40 hover:bg-adtraxio-accent/5",
        selected
          ? "border-adtraxio-accent bg-adtraxio-accent/10 ring-1 ring-adtraxio-accent/30"
          : "border-border bg-adtraxio-surface/50"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
            selected
              ? "border-adtraxio-accent bg-adtraxio-accent text-primary-foreground"
              : "border-border bg-transparent",
            multi && !selected && "rounded-md"
          )}
        >
          {selected && <Check className="size-3" strokeWidth={3} />}
        </span>
      </div>
    </button>
  );
}
