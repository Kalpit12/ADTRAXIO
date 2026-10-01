"use client";

import { useCallback, useEffect, useState } from "react";
import { ApprovalWorkflowSection } from "@/components/collaboration/approval-workflow-section";
import type { CampaignApprovalRecord } from "@/lib/collaboration/types";

interface CampaignApprovalPanelProps {
  campaignId: string;
}

export function CampaignApprovalPanel({ campaignId }: CampaignApprovalPanelProps) {
  const [approval, setApproval] = useState<CampaignApprovalRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadApproval = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/approval`);
      const payload = (await response.json()) as {
        approval?: CampaignApprovalRecord | null;
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
  }, [campaignId]);

  useEffect(() => {
    void loadApproval();
  }, [loadApproval]);

  async function runAction(path: string, body?: Record<string, unknown>) {
    setActionLoading(true);
    setError(null);

    try {
      const url =
        path === "request"
          ? `/api/campaigns/${campaignId}/approval`
          : `/api/campaigns/${campaignId}/approval/${path}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : "{}",
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

  const canReview =
    approval?.status === "pending" || approval?.status === "changes_requested";
  const canRequest =
    !approval ||
    approval.status === "cancelled" ||
    approval.status === "rejected" ||
    approval.status === "changes_requested";

  return (
    <ApprovalWorkflowSection
      title="Campaign review"
      description="Align stakeholders before this campaign moves forward."
      approval={approval}
      loading={loading}
      actionLoading={actionLoading}
      error={error}
      canReview={canReview}
      canRequest={canRequest}
      onRequest={() => void runAction("request")}
      onApprove={() => void runAction("approve")}
      onReject={(reason) => void runAction("reject", { reason })}
      onRequestChanges={(reason) => void runAction("changes", { reason })}
      onCancel={() => void runAction("cancel")}
      activityEntityType="campaign_approval"
      activityEntityId={approval?.id}
      campaignId={campaignId}
    />
  );
}
