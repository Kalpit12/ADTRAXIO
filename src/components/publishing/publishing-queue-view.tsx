"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScheduledPostRow } from "@/components/publishing/scheduled-post-row";
import { PublishingEmptyState } from "@/components/publishing/publishing-empty-state";
import { PublishCancelDialog } from "@/components/publishing/publish-cancel-dialog";
import { PublishingSkeleton } from "@/components/publishing/publishing-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { friendlyPublishError } from "@/components/publishing/publish-status-badge";
import type { PublishingStatus, ScheduledPostRecord } from "@/lib/publishing/types";
import { cn } from "@/lib/utils";

const SECTION_ORDER: Array<{
  key: PublishingStatus | "upcoming";
  title: string;
  description: string;
  statuses: PublishingStatus[];
}> = [
  {
    key: "upcoming",
    title: "Upcoming",
    description: "Scheduled and in progress",
    statuses: ["scheduled", "publishing", "draft"],
  },
  {
    key: "published",
    title: "Published",
    description: "Successfully delivered",
    statuses: ["published"],
  },
  {
    key: "failed",
    title: "Needs attention",
    description: "Failed to publish",
    statuses: ["failed"],
  },
  {
    key: "cancelled",
    title: "Cancelled",
    description: "Removed from schedule",
    statuses: ["cancelled"],
  },
];

type StatusFilter = "all" | PublishingStatus;

export function PublishingQueueView() {
  const [posts, setPosts] = useState<ScheduledPostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [cancelTarget, setCancelTarget] = useState<ScheduledPostRecord | null>(
    null
  );

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/publishing/posts");
      const payload = (await response.json()) as {
        posts?: ScheduledPostRecord[];
        error?: string;
      };

      if (!response.ok) {
        setError(
          friendlyPublishError(
            payload.error ?? "Unable to load publishing queue."
          )
        );
        return;
      }

      setPosts(payload.posts ?? []);
    } catch {
      setError("Unable to load publishing queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  async function runAction(postId: string, action: "cancel" | "retry") {
    setActionId(postId);
    setError(null);

    try {
      const response = await fetch(`/api/publishing/posts/${postId}/${action}`, {
        method: "POST",
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(friendlyPublishError(payload.error ?? "Action failed."));
        return;
      }

      await loadPosts();
    } catch {
      setError("Action failed.");
    } finally {
      setActionId(null);
    }
  }

  function requestCancel(post: ScheduledPostRecord) {
    setCancelTarget(post);
  }

  async function confirmCancelPost() {
    if (!cancelTarget) return;
    const id = cancelTarget.id;
    await runAction(id, "cancel");
    setCancelTarget(null);
  }

  const filteredPosts = useMemo(() => {
    if (filter === "all") return posts;
    return posts.filter((p) => p.status === filter);
  }, [posts, filter]);

  const statusCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const post of posts) {
      map.set(post.status, (map.get(post.status) ?? 0) + 1);
    }
    return map;
  }, [posts]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Publishing"
        description="Schedule and manage what goes out, where, and when — separate from campaign strategy."
      >
        <Button asChild size="sm" variant="outline">
          <Link href="/create">Content Studio</Link>
        </Button>
      </PageHeader>

      <p className="text-xs text-muted-foreground">
        Campaign objectives live in{" "}
        <Link href="/campaigns" className="font-medium text-foreground hover:underline">
          Campaigns
        </Link>
        .
      </p>

      {!loading && posts.length > 0 && (
        <div
          className="flex flex-wrap gap-1 rounded-md border border-border/70 bg-adtraxio-surface/15 p-1"
          role="group"
          aria-label="Filter by status"
        >
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "min-h-9 rounded px-3 py-1.5 text-xs font-medium",
              filter === "all"
                ? "bg-white/[0.06] ring-1 ring-adtraxio-accent/20"
                : "text-muted-foreground"
            )}
            aria-pressed={filter === "all"}
          >
            All ({posts.length})
          </button>
          {(["scheduled", "published", "failed", "cancelled"] as const).map(
            (status) => {
              const count = statusCounts.get(status) ?? 0;
              if (count === 0) return null;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilter(status)}
                  className={cn(
                    "min-h-9 rounded px-3 py-1.5 text-xs font-medium capitalize",
                    filter === status
                      ? "bg-white/[0.06] ring-1 ring-adtraxio-accent/20"
                      : "text-muted-foreground"
                  )}
                  aria-pressed={filter === status}
                >
                  {status} ({count})
                </button>
              );
            }
          )}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-500/25 bg-red-500/5 px-4 py-3"
        >
          <p className="text-sm text-red-200/90">{error}</p>
          <button
            type="button"
            onClick={() => void loadPosts()}
            className="mt-2 text-xs font-medium text-foreground underline-offset-2 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <PublishingSkeleton />
      ) : posts.length === 0 ? (
        <PublishingEmptyState />
      ) : filter !== "all" ? (
        <section>
          <ul className="rounded-md border border-border/60 bg-adtraxio-surface/10">
            {filteredPosts.map((post) => (
              <ScheduledPostRow
                key={post.id}
                post={post}
                actionLoading={actionId === post.id}
                onCancel={
                  post.status === "scheduled"
                    ? () => requestCancel(post)
                    : undefined
                }
                onRetry={
                  post.status === "failed"
                    ? () => void runAction(post.id, "retry")
                    : undefined
                }
              />
            ))}
          </ul>
        </section>
      ) : (
        <div className="space-y-10">
          {SECTION_ORDER.map((section) => {
            const items = posts.filter((p) =>
              section.statuses.includes(p.status)
            );
            if (items.length === 0) return null;

            return (
              <section key={section.key}>
                <div className="mb-3">
                  <h2 className="font-heading text-base tracking-tight text-foreground">
                    {section.title}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {section.description}
                  </p>
                </div>
                <ul className="rounded-md border border-border/60 bg-adtraxio-surface/10">
                  {items.map((post) => (
                    <ScheduledPostRow
                      key={post.id}
                      post={post}
                      actionLoading={actionId === post.id}
                      onCancel={
                        post.status === "scheduled"
                          ? () => requestCancel(post)
                          : undefined
                      }
                      onRetry={
                        post.status === "failed"
                          ? () => void runAction(post.id, "retry")
                          : undefined
                      }
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <PublishCancelDialog
        open={cancelTarget != null}
        post={cancelTarget}
        loading={cancelTarget != null && actionId === cancelTarget.id}
        onConfirm={() => void confirmCancelPost()}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
