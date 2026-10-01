"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export function NotificationsBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/notifications?limit=1")
      .then((r) => r.json())
      .then((payload: { unreadCount?: number }) => {
        setUnreadCount(payload.unreadCount ?? 0);
      })
      .catch(() => undefined);
  }, []);

  return (
    <Link
      href="/notifications"
      className="relative inline-flex size-8 items-center justify-center rounded-md border border-border/70 bg-transparent text-muted-foreground transition-colors hover:border-border hover:bg-white/[0.03] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-adtraxio-accent/30"
      aria-label={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : "Notifications"
      }
    >
      <Bell className="size-4" strokeWidth={1.5} />
      {unreadCount > 0 && (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-background bg-adtraxio-accent px-1 text-[10px] font-medium text-primary-foreground"
          )}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
