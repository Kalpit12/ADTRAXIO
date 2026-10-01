"use client";

import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/dashboard/platform-icon";
import type { ScheduledPostRecord } from "@/lib/publishing/types";

export function PublishCancelDialog({
  open,
  post,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  post: ScheduledPostRecord | null;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open || !post) return null;

  const when = post.scheduledFor
    ? new Date(post.scheduledFor).toLocaleString()
    : "the scheduled time";
  const account =
    post.accountUsername ?? post.accountName ?? post.platform;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onCancel}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-post-title"
        className="w-full max-w-md rounded-lg border border-border/80 bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border/60 px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground">Publishing</p>
          <h2 id="cancel-post-title" className="text-lg font-semibold text-foreground">
            Cancel scheduled post?
          </h2>
        </div>
        <div className="space-y-4 px-5 py-5 text-sm">
          <div className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-3">
            <PlatformIcon platform={post.platform} size="sm" />
            <div className="min-w-0">
              <p className="font-medium text-foreground">{account}</p>
              <p className="text-xs text-muted-foreground">Scheduled for {when}</p>
            </div>
          </div>
          <p className="leading-relaxed text-muted-foreground">
            This removes the post from your publishing queue. It will not be sent
            to the social network. You can schedule it again later from Content
            Studio or Campaigns.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border/60 px-5 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={loading} onClick={onCancel}>
            Keep scheduled
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Canceling…" : "Cancel post"}
          </Button>
        </div>
      </div>
    </div>
  );
}
