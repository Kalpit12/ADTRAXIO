"use client";

import { useCallback, useEffect, useState } from "react";
import { ApprovalWorkflowSection } from "@/components/collaboration/approval-workflow-section";
import type { ContentApprovalRecord } from "@/lib/collaboration/types";

interface ContentApprovalPanelProps {
  contentId: string | null;
}

export function ContentApprovalPanel({ contentId }: ContentApprovalPanelProps) {
  const [approval, setApproval] = useState<ContentApprovalRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const canReview =
    approval?.status === "pending" || approval?.status === "changes_requested";
  const canRequest =
    !approval ||
    approval.status === "cancelled" ||
    approval.status === "rejected" ||
    approval.status === "changes_requested";

  return (
    <ApprovalWorkflowSection
      title="Content review"
      description="Publishing may be blocked until content is approved."
      approval={approval}
      loading={loading}
      actionLoading={actionLoading}
      error={error}
      canReview={canReview}
      canRequest={canRequest}
      onRequest={() => void runAction("")}
      onApprove={() => void runAction("approve")}
      onReject={(reason) => void runAction("reject", { reason })}
      onRequestChanges={(reason) => void runAction("changes", { reason })}
      onCancel={() => void runAction("cancel")}
      activityEntityType="content_approval"
      activityEntityId={approval?.id}
      contentId={contentId}
    />
  );
}
