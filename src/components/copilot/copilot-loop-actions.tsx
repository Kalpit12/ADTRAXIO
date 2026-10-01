"use client";

import type { CopilotQuickAction } from "@/components/assistant/constants";
import { COPILOT_LOOP_ACTIONS } from "@/components/assistant/constants";
import { cn } from "@/lib/utils";

interface CopilotLoopActionsProps {
  onSelect: (prompt: string) => void;
  actions?: CopilotQuickAction[];
  compact?: boolean;
}

export function CopilotLoopActions({
  onSelect,
  actions = COPILOT_LOOP_ACTIONS,
  compact = false,
}: CopilotLoopActionsProps) {
  return (
    <div
      className={cn(
        "grid gap-2",
        compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"
      )}
    >
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => onSelect(action.prompt)}
            className={cn(
              "group flex min-h-[44px] flex-col items-start gap-2 rounded-md border border-border/60 bg-adtraxio-surface/15 px-4 py-3 text-left transition-colors",
              "hover:border-adtraxio-accent/25 hover:bg-adtraxio-surface/25",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-adtraxio-accent/30"
            )}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {action.loop}
              </span>
              <Icon
                className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-adtraxio-accent"
                strokeWidth={1.5}
                aria-hidden
              />
            </span>
            <span className="text-sm font-medium text-foreground">
              {action.label}
            </span>
            {!compact && (
              <span className="text-xs leading-relaxed text-muted-foreground">
                {action.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
