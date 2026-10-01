"use client";

import { formatActivityAction } from "@/lib/collaboration/display";
import type { ActivityLogEntry } from "@/lib/collaboration/types";

interface ApprovalActivityTimelineProps {
  activity: ActivityLogEntry[];
  loading?: boolean;
}

export function ApprovalActivityTimeline({
  activity,
  loading,
}: ApprovalActivityTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1].map((i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-secondary/20" />
        ))}
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No review activity yet.</p>
    );
  }

  return (
    <ol className="space-y-0 border-l border-border/60 pl-4">
      {activity.map((entry) => (
        <li key={entry.id} className="relative pb-4 last:pb-0">
          <span
            className="absolute -left-[5px] top-1.5 size-2 rounded-full border border-border bg-background"
            aria-hidden
          />
          <p className="text-sm text-foreground">
            {formatActivityAction(entry.action)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {entry.actorName ? `${entry.actorName} · ` : ""}
            {new Date(entry.createdAt).toLocaleString()}
          </p>
        </li>
      ))}
    </ol>
  );
}
