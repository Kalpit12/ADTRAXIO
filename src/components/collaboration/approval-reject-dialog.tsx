"use client";

import { Button } from "@/components/ui/button";

interface ApprovalRejectDialogProps {
  open: boolean;
  variant: "reject" | "changes";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ApprovalRejectDialog({
  open,
  variant,
  loading,
  onConfirm,
  onCancel,
}: ApprovalRejectDialogProps) {
  if (!open) return null;

  const isReject = variant === "reject";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-reject-title"
        className="w-full max-w-md rounded-lg border border-border/80 bg-background shadow-xl"
      >
        <div className="border-b border-border/60 px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground">Confirm</p>
          <h2 id="approval-reject-title" className="text-lg font-semibold text-foreground">
            {isReject ? "Reject this work?" : "Request changes?"}
          </h2>
        </div>
        <p className="px-5 py-4 text-sm leading-relaxed text-muted-foreground">
          {isReject
            ? "The submitter will need to start a new review cycle if they want approval again."
            : "The submitter can update the work and resubmit for review."}
        </p>
        <div className="flex flex-col-reverse gap-2 border-t border-border/60 px-5 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={loading} onClick={onCancel}>
            Go back
          </Button>
          <Button
            type="button"
            variant={isReject ? "destructive" : "default"}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Working…" : isReject ? "Reject" : "Request changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
