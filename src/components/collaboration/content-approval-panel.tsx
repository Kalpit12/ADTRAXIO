"use client";

import { useCallback, useEffect, useState } from "react";
import { ApprovalStatusBadge } from "@/components/collaboration/approval-status-badge";
import { ActivityPanel } from "@/components/collaboration/activity-panel";
import { CommentsPanel } from "@/components/collaboration/comments-panel";
import { Button } from "@/components/ui/button";
import type { ContentApprovalRecord } from "@/lib/collaboration/types";

interface ContentApprovalPanelProps {
  contentId: string | null;
}

export function ContentApprovalPanel({ contentId }: ContentApprovalPanelProps) {
  const [approval, setApproval] = useState<ContentApprovalRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const loadApproval = useCallback(async () => {
    if (!contentId || contentId.startsWith("local-")) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/content/${contentId}/approval`);
      const payload = (await response.json()) as {
        approval?: ContentApprovalRecord | null;
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Unable to load approval.");
        return;
      }
      setApproval(payload.approval ?? null);
    } catch {
      setError("Unable to load approval.");
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    void loadApproval();
  }, [loadApproval]);

  async function runAction(path: string, body?: Record<string, unknown>) {
    if (!contentId) return;
    setActionLoading(true);
    setError(null);

    const url = path
      ? `/api/content/${contentId}/approval/${path}`
      : `/api/content/${contentId}/approval`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Action failed.");
        return;
      }
      await loadApproval();
    } catch {
      setError("Action failed.");
    } finally {
      setActionLoading(false);
    }
  }

  if (!contentId || contentId.startsWith("local-")) {
    return null;
  }

  const canReview = approval?.status === "pending" || approval?.status === "changes_requested";
  const canRequest =
    !approval ||
    approval.status === "cancelled" ||
    approval.status === "rejected" ||
    approval.status === "changes_requested";

  return (
    <section className="mt-8 space-y-4 border-t border-border/60 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Review</p>
          <h2 className="text-lg font-medium text-foreground">Content approval</h2>
        </div>
        {approval && <ApprovalStatusBadge status={approval.status} />}
      </div>

      {loading && <p className="text-xs text-muted-foreground">Loading review status…</p>}

      {approval && (
        <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div>
            <dt>Requested</dt>
            <dd className="text-foreground">
              {new Date(approval.requestedAt).toLocaleString()}
            </dd>
          </div>
          {approval.reviewedAt && (
            <div>
              <dt>Reviewed</dt>
              <dd className="text-foreground">
                {new Date(approval.reviewedAt).toLocaleString()}
              </dd>
            </div>
          )}
          {approval.rejectionReason && (
            <div className="sm:col-span-2">
              <dt>Note</dt>
              <dd className="text-foreground">{approval.rejectionReason}</dd>
            </div>
          )}
        </dl>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {canRequest && (
          <Button
            size="sm"
            variant="outline"
            disabled={actionLoading}
            onClick={() => void runAction("")}
          >
            Request review
          </Button>
        )}
        {canReview && (
          <>
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={() => void runAction("approve")}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={actionLoading}
              onClick={() => void runAction("reject", { reason })}
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={actionLoading}
              onClick={() => void runAction("changes", { reason })}
            >
              Request changes
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={actionLoading}
              onClick={() => void runAction("cancel")}
            >
              Cancel
            </Button>
          </>
        )}
      </div>

      {canReview && (
        <input
          className="flex h-9 w-full max-w-md rounded-md border border-border/70 bg-transparent px-3 text-sm outline-none focus:border-adtraxio-accent/50"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional note for reject / changes"
        />
      )}

      <CommentsPanel contentId={contentId} approvalId={approval?.id} />
      {approval && (
        <div className="rounded-lg border border-border/70 p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Activity</p>
          <ActivityPanel entityType="content_approval" entityId={approval.id} />
        </div>
      )}
    </section>
  );
}
