"use client";

import { useEffect, useState } from "react";
import { ApprovalActivityTimeline } from "@/components/collaboration/approval-activity-timeline";
import { ApprovalCommentList } from "@/components/collaboration/approval-comment-list";
import { ApprovalRejectDialog } from "@/components/collaboration/approval-reject-dialog";
import { ApprovalStatusBadge } from "@/components/collaboration/approval-status-badge";
import { Button } from "@/components/ui/button";
import { friendlyCollaborationError } from "@/lib/collaboration/display";
import type { ApprovalStatus } from "@/lib/collaboration/types";
import type { ActivityLogEntry } from "@/lib/collaboration/types";

export interface ApprovalWorkflowState {
  id: string;
  status: ApprovalStatus;
  requestedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

interface ApprovalWorkflowSectionProps {
  title: string;
  description?: string;
  approval: ApprovalWorkflowState | null;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  canReview: boolean;
  canRequest: boolean;
  onRequest: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onRequestChanges: (reason: string) => void;
  onCancel: () => void;
  activityEntityType: string;
  activityEntityId?: string;
  contentId?: string;
  campaignId?: string;
}

export function ApprovalWorkflowSection({
  title,
  description,
  approval,
  loading,
  actionLoading,
  error,
  canReview,
  canRequest,
  onRequest,
  onApprove,
  onReject,
  onRequestChanges,
  onCancel,
  activityEntityType,
  activityEntityId,
  contentId,
  campaignId,
}: ApprovalWorkflowSectionProps) {
  const [reason, setReason] = useState("");
  const [pendingDialog, setPendingDialog] = useState<"reject" | "changes" | null>(
    null
  );
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    if (!activityEntityId) {
      setActivity([]);
      return;
    }
    setActivityLoading(true);
    const params = new URLSearchParams({
      entityType: activityEntityType,
      entityId: activityEntityId,
      limit: "20",
    });
    fetch(`/api/collaboration/activity?${params.toString()}`)
      .then((r) => r.json())
      .then((payload: { activity?: ActivityLogEntry[] }) => {
        setActivity(payload.activity ?? []);
      })
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false));
  }, [activityEntityId, activityEntityType]);

  return (
    <section className="space-y-6 border-t border-border/60 pt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Approvals
          </p>
          <h2 className="font-heading text-lg tracking-tight text-foreground">
            {title}
          </h2>
          {description && (
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {approval && <ApprovalStatusBadge status={approval.status} />}
      </div>

      {loading && (
        <div className="h-12 animate-pulse rounded-md bg-secondary/20" aria-busy="true" />
      )}

      {approval && !loading && (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Submitted
            </dt>
            <dd className="mt-0.5 text-foreground">
              {new Date(approval.requestedAt).toLocaleString()}
            </dd>
          </div>
          {approval.reviewedAt && (
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Last decision
              </dt>
              <dd className="mt-0.5 text-foreground">
                {new Date(approval.reviewedAt).toLocaleString()}
              </dd>
            </div>
          )}
          {approval.rejectionReason && (
            <div className="sm:col-span-2">
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Note
              </dt>
              <dd className="mt-0.5 text-foreground">{approval.rejectionReason}</dd>
            </div>
          )}
        </dl>
      )}

      {!approval && !loading && (
        <p className="text-sm text-muted-foreground">
          No review in progress. Request review when this work is ready for a decision.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-200/90">
          {friendlyCollaborationError(error)}
        </p>
      )}

      {canReview && (
        <div className="space-y-2">
          <label htmlFor="approval-note" className="text-sm font-medium text-foreground">
            Note for reject or changes
          </label>
          <textarea
            id="approval-note"
            className="w-full rounded-md border border-border/70 bg-background px-3 py-2.5 text-sm outline-none focus:border-adtraxio-accent/40"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Optional — required for clear feedback"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canRequest && (
          <Button
            size="sm"
            variant="outline"
            disabled={actionLoading}
            onClick={onRequest}
          >
            Request review
          </Button>
        )}
        {canReview && (
          <>
            <Button size="sm" disabled={actionLoading} onClick={onApprove}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={actionLoading}
              onClick={() => setPendingDialog("changes")}
            >
              Request changes
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={actionLoading}
              onClick={() => setPendingDialog("reject")}
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              disabled={actionLoading}
              onClick={onCancel}
            >
              Cancel review
            </Button>
          </>
        )}
      </div>

      <div className="rounded-md border border-border/60 px-4 py-5 sm:px-5">
        <ApprovalCommentList
          contentId={contentId}
          campaignId={campaignId}
          approvalId={approval?.id}
        />
      </div>

      {approval && (
        <div>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            History
          </p>
          <ApprovalActivityTimeline activity={activity} loading={activityLoading} />
        </div>
      )}

      <ApprovalRejectDialog
        open={pendingDialog != null}
        variant={pendingDialog === "reject" ? "reject" : "changes"}
        loading={actionLoading}
        onCancel={() => setPendingDialog(null)}
        onConfirm={() => {
          if (pendingDialog === "reject") {
            onReject(reason);
          } else if (pendingDialog === "changes") {
            onRequestChanges(reason);
          }
          setPendingDialog(null);
        }}
      />
    </section>
  );
}
