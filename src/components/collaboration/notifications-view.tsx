"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { NotificationRecord } from "@/lib/collaboration/types";

export function NotificationsView() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications");
      const payload = (await response.json()) as {
        notifications?: NotificationRecord[];
      };
      setNotifications(payload.notifications ?? []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    await load();
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    await load();
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Collaboration</p>
          <h1 className="font-heading mt-1 text-3xl tracking-tight text-foreground">
            Notifications
          </h1>
        </div>
        <Button size="sm" variant="outline" onClick={() => void markAllRead()}>
          Mark all read
        </Button>
      </header>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && notifications.length === 0 && (
        <p className="text-sm text-muted-foreground">No notifications.</p>
      )}

      <ul className="divide-y divide-border/60 rounded-lg border border-border/70">
        {notifications.map((item) => (
          <li
            key={item.id}
            className={`px-4 py-4 sm:px-6 ${item.readAt ? "opacity-70" : ""}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                <p className="mt-2 text-xs text-muted-foreground/70">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
              {!item.readAt && (
                <Button size="sm" variant="ghost" onClick={() => void markRead(item.id)}>
                  Mark read
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
