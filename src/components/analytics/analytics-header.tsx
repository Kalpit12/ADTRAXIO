"use client";

import { AskAdtraxioLink } from "@/components/assistant/ask-adtraxio-link";
import { Button } from "@/components/ui/button";

interface AnalyticsHeaderProps {
  syncing: boolean;
  lastSyncedAt: string | null;
  onRefresh: () => void;
}

export function AnalyticsHeader({
  syncing,
  lastSyncedAt,
  onRefresh,
}: AnalyticsHeaderProps) {
  return (
    <header className="border-b border-border/60 pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Analytics</p>
          <h1 className="font-heading mt-1 text-3xl tracking-tight text-foreground sm:text-4xl">
            Performance
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Track how your connected channels are performing.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <AskAdtraxioLink
            variant="button"
            label="Explain this performance"
            prompt="Explain my current 30-day performance. What changed vs the prior period and what should I do next?"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={syncing}
            onClick={onRefresh}
          >
            {syncing ? "Refreshing…" : "Refresh data"}
          </Button>
          {lastSyncedAt && (
            <p className="text-xs text-muted-foreground">
              Updated {new Date(lastSyncedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
