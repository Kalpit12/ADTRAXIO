"use client";

import { PlatformIcon } from "@/components/dashboard/platform-icon";
import {
  PublishStatusBadge,
  friendlyPublishError,
} from "@/components/publishing/publish-status-badge";
import { Button } from "@/components/ui/button";
import type { ScheduledPostRecord } from "@/lib/publishing/types";

function formatWhen(post: ScheduledPostRecord): string {
  if (post.status === "published" && post.publishedAt) {
    return new Date(post.publishedAt).toLocaleString();
  }
  if (post.scheduledFor) {
    return new Date(post.scheduledFor).toLocaleString();
  }
  return new Date(post.createdAt).toLocaleString();
}

function accountLabel(post: ScheduledPostRecord): string {
  const handle = post.accountUsername
    ? `@${post.accountUsername.replace(/^@/, "")}`
    : null;
  return handle ?? post.accountName ?? post.platform;
}

interface ScheduledPostRowProps {
  post: ScheduledPostRecord;
  actionLoading?: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
}

export function ScheduledPostRow({
  post,
  actionLoading,
  onCancel,
  onRetry,
}: ScheduledPostRowProps) {
  return (
    <li
      className="flex flex-col gap-3 border-b border-border/50 px-4 py-4 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:px-5"
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <PlatformIcon platform={post.platform} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">
              {accountLabel(post)}
            </p>
            <span className="text-xs capitalize text-muted-foreground">
              {post.platform}
            </span>
            {post.mediaType && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {post.mediaType}
              </span>
            )}
          </div>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {post.caption?.trim() || "No caption"}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {post.status === "published" ? "Published" : "Scheduled"} ·{" "}
            {formatWhen(post)}
            {post.timezone ? ` · ${post.timezone}` : ""}
          </p>
          {post.status === "failed" && post.errorMessage && (
            <p className="mt-2 text-xs text-red-200/90">
              {friendlyPublishError(post.errorMessage)}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
        <PublishStatusBadge status={post.status} />
        {post.status === "scheduled" && onCancel && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={actionLoading}
            onClick={onCancel}
          >
            Cancel schedule
          </Button>
        )}
        {post.status === "failed" && onRetry && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={actionLoading}
            onClick={onRetry}
          >
            Try again
          </Button>
        )}
      </div>
    </li>
  );
}
