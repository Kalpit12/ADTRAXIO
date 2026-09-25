"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { DashboardSection, DashboardSectionHeader } from "@/components/dashboard/dashboard-panel";
import type { ScheduledPostRecord } from "@/lib/publishing/types";

export function UpcomingPosts() {
  const [posts, setPosts] = useState<ScheduledPostRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/publishing/posts")
      .then((res) => res.json())
      .then((data: { posts?: ScheduledPostRecord[] }) => {
        const scheduled = (data.posts ?? []).filter(
          (post) => post.status === "scheduled"
        );
        setPosts(scheduled.slice(0, 5));
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardSection>
      <DashboardSectionHeader
        title="Upcoming"
        action={
          <Link
            href="/publishing"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            View queue
          </Link>
        }
      />

      {loading ? (
        <div className="mt-4 h-20 animate-pulse rounded-md bg-secondary/30" />
      ) : posts.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No scheduled posts yet.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border/60">
          {posts.map((post) => (
            <li key={post.id} className="flex items-center gap-3 py-3">
              <PlatformIcon platform={post.platform} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">
                  {post.caption ?? "Scheduled post"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {post.scheduledFor
                    ? new Date(post.scheduledFor).toLocaleString()
                    : "Pending schedule"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
