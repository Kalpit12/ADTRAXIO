"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApprovalActivityRow,
  ApprovalNotificationRow,
} from "@/components/collaboration/approval-row";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  activityReviewHref,
  friendlyCollaborationError,
  isApprovalNotification,
} from "@/lib/collaboration/display";
import type { ActivityLogEntry, NotificationRecord } from "@/lib/collaboration/types";

const APPROVAL_ACTIONS = new Set([
  "approval_requested",
  "approval_approved",
  "approval_rejected",
  "approval_changes_requested",
  "approval_cancelled",
]);

export function ApprovalsView() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [notifRes, activityRes] = await Promise.all([
        fetch("/api/notifications?limit=50"),
        fetch("/api/collaboration/activity?limit=40"),
      ]);

      const notifPayload = (await notifRes.json()) as {
        notifications?: NotificationRecord[];
        error?: string;
      };
      const activityPayload = (await activityRes.json()) as {
        activity?: ActivityLogEntry[];
        error?: string;
      };

      if (!notifRes.ok) {
        setError(notifPayload.error ?? "Unable to load approvals.");
        return;
      }

      setNotifications(
        (notifPayload.notifications ?? []).filter((n) =>
          isApprovalNotification(n.type)
        )
      );
      setActivity(
        (activityPayload.activity ?? []).filter((a) =>
          APPROVAL_ACTIONS.has(a.action)
        )
      );
    } catch {
      setError("Unable to load approvals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const needsAttention = useMemo(
    () => notifications.filter((n) => !n.readAt),
    [notifications]
  );

  const recentActivity = useMemo(() => activity.slice(0, 15), [activity]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    void load();
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Approvals"
        description="Review content and campaign work before it moves forward."
      >
        <Button asChild size="sm" variant="outline">
          <Link href="/notifications">All notifications</Link>
        </Button>
      </PageHeader>

      <p className="text-xs text-muted-foreground">
        Decisions happen on the content or campaign itself — open{" "}
        <Link href="/create" className="font-medium text-foreground hover:underline">
          Content Studio
        </Link>{" "}
        or{" "}
        <Link href="/campaigns" className="font-medium text-foreground hover:underline">
          Campaigns
        </Link>{" "}
        to approve, request changes, or reject.
      </p>

      {error && (
        <div role="alert" className="rounded-md border border-red-500/25 bg-red-500/5 px-4 py-3 text-sm text-red-200/90">
          {friendlyCollaborationError(error)}
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 block text-xs font-medium text-foreground underline-offset-2 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          <div className="h-14 animate-pulse rounded-md bg-secondary/20" />
          <div className="h-14 animate-pulse rounded-md bg-secondary/20" />
        </div>
      ) : (
        <>
          <section aria-labelledby="needs-review-heading">
            <h2
              id="needs-review-heading"
              className="font-heading text-lg tracking-tight text-foreground"
            >
              Needs your review
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Unread approval notifications for this workspace.
            </p>
            {needsAttention.length === 0 ? (
              <div className="mt-5 rounded-md border border-border/60 bg-adtraxio-surface/10 px-6 py-10 text-center">
                <p className="font-heading text-lg text-foreground">
                  No approvals need your attention
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  When someone requests review, you will see it here and in
                  notifications.
                </p>
              </div>
            ) : (
              <ul className="mt-5 overflow-hidden rounded-md border border-border/60">
                {needsAttention.map((item) => (
                  <ApprovalNotificationRow
                    key={item.id}
                    item={item}
                    onMarkRead={() => void markRead(item.id)}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="border-t border-border/60 pt-10" aria-labelledby="recent-heading">
            <h2
              id="recent-heading"
              className="font-heading text-lg tracking-tight text-foreground"
            >
              Recent review activity
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              From your workspace activity log — not a full approval registry.
            </p>
            {recentActivity.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No review activity yet.
              </p>
            ) : (
              <ul className="mt-5 overflow-hidden rounded-md border border-border/60">
                {recentActivity.map((entry) => {
                  const link = activityReviewHref(entry.metadata);
                  return (
                    <ApprovalActivityRow
                      key={entry.id}
                      entry={entry}
                      href={link?.href}
                      hrefLabel={link?.label}
                    />
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
