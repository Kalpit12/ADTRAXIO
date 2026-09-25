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
      className="relative inline-flex size-8 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition-colors hover:text-foreground"
      aria-label="Notifications"
    >
      <Bell className="size-4" />
      {unreadCount > 0 && (
        <span
          className={cn(
            "absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-adtraxio-accent px-1 text-[10px] font-medium text-background"
          )}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
