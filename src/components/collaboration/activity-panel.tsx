"use client";

import { useEffect, useState } from "react";
import type { ActivityLogEntry } from "@/lib/collaboration/types";

interface ActivityPanelProps {
  entityType: string;
  entityId: string;
}

export function ActivityPanel({ entityType, entityId }: ActivityPanelProps) {
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({
      entityType,
      entityId,
      limit: "20",
    });

    fetch(`/api/collaboration/activity?${params.toString()}`)
      .then((r) => r.json())
      .then((payload: { activity?: ActivityLogEntry[] }) => {
        setActivity(payload.activity ?? []);
      })
      .catch(() => setActivity([]))
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading activity…</p>;
  }

  if (activity.length === 0) {
    return <p className="text-xs text-muted-foreground">No activity yet.</p>;
  }

  return (
    <ul className="space-y-2 text-xs text-muted-foreground">
      {activity.map((entry) => (
        <li key={entry.id} className="flex justify-between gap-3 border-b border-border/40 pb-2">
          <span className="text-foreground">{entry.action.replace(/_/g, " ")}</span>
          <span className="shrink-0">{new Date(entry.createdAt).toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}
