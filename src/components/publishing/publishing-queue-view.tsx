"use client";

import { useCallback, useEffect, useState } from "react";
import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { Button } from "@/components/ui/button";
import type { ScheduledPostRecord } from "@/lib/publishing/types";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
  cancelled: "Cancelled",
  draft: "Draft",
};

function formatWhen(post: ScheduledPostRecord): string {
  if (post.status === "published" && post.publishedAt) {
    return new Date(post.publishedAt).toLocaleString();
  }
  if (post.scheduledFor) {
    return new Date(post.scheduledFor).toLocaleString();
  }
  return new Date(post.createdAt).toLocaleString();
}

function statusClass(status: string): string {
  switch (status) {
    case "published":
      return "text-adtraxio-accent";
    case "failed":
      return "text-red-300";
    case "scheduled":
      return "text-amber-300";
    case "publishing":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
}

export function PublishingQueueView() {
  const [posts, setPosts] = useState<ScheduledPostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

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
        setError(payload.error ?? "Unable to load publishing queue.");
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
        setError(payload.error ?? "Action failed.");
        return;
      }

      await loadPosts();
    } catch {
      setError("Action failed.");
    } finally {
      setActionId(null);
    }
  }

  const grouped = {
    scheduled: posts.filter((post) => post.status === "scheduled"),
    publishing: posts.filter((post) => post.status === "publishing"),
    published: posts.filter((post) => post.status === "published"),
    failed: posts.filter((post) => post.status === "failed"),
  };

  return (
    <div className="space-y-10">
      <header className="border-b border-border/60 pb-6">
        <p className="text-xs font-medium text-muted-foreground">Publishing</p>
        <h1 className="font-heading mt-1 text-3xl tracking-tight text-foreground sm:text-4xl">
          Queue
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Scheduled, in-progress, published, and failed posts for your workspace.
        </p>
      </header>

      {error && (
        <p className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded-md bg-secondary/30" />
          <div className="h-16 animate-pulse rounded-md bg-secondary/30" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-border/60 px-4 py-8 text-sm text-muted-foreground">
          No publishing activity yet. Save content in the studio and publish from there.
        </div>
      ) : (
        <div className="space-y-10">
          {(["scheduled", "publishing", "published", "failed"] as const).map(
            (section) => {
              const items = grouped[section];
              if (items.length === 0) return null;

              return (
                <section key={section}>
                  <h2 className="text-sm font-medium text-foreground">
                    {STATUS_LABELS[section]}
                  </h2>
                  <ul className="mt-4 divide-y divide-border/60 rounded-lg border border-border/60">
                    {items.map((post) => (
                      <li
                        key={post.id}
                        className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <PlatformIcon platform={post.platform} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {post.accountName ?? post.accountUsername ?? post.platform}
                            </p>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {post.caption ?? "No caption"}
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground/80">
                              {formatWhen(post)}
                              {post.timezone ? ` · ${post.timezone}` : ""}
                            </p>
                            {post.platformPostId && (
                              <p className="mt-1 truncate text-xs text-muted-foreground/70">
                                Post ID: {post.platformPostId}
                              </p>
                            )}
                            {post.errorMessage && (
                              <p className="mt-1 text-xs text-red-300">{post.errorMessage}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={cn("text-xs font-medium", statusClass(post.status))}>
                            {STATUS_LABELS[post.status] ?? post.status}
                          </span>
                          {post.status === "scheduled" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={actionId === post.id}
                              onClick={() => void runAction(post.id, "cancel")}
                            >
                              Cancel
                            </Button>
                          )}
                          {post.status === "failed" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={actionId === post.id}
                              onClick={() => void runAction(post.id, "retry")}
                            >
                              Retry
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
