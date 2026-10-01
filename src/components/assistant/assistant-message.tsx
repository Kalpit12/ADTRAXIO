"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnalyticsResult } from "@/components/assistant/analytics-result";
import { ContentResultCard } from "@/components/assistant/content-result-card";
import { PendingActionCard } from "@/components/assistant/pending-action-card";
import { SafeMarkdown } from "@/components/assistant/safe-markdown";
import { ToolActivity } from "@/components/assistant/tool-activity";
import { ContentCreatedCard } from "@/components/assistant/content-created-card";
import { ContentRepurposeCard } from "@/components/assistant/content-repurpose-card";
import { ReportAnalysisCard } from "@/components/assistant/report-analysis-card";
import { StrategyPlanCard } from "@/components/assistant/strategy-plan-card";
import {
  extractAnalyticsOverview,
  extractContentCreated,
  extractContentDraft,
  extractRepurposeResult,
  extractReportContext,
  extractStrategyPlan,
} from "@/components/assistant/utils";
import { CopilotResponseFrame } from "@/components/copilot/copilot-response-frame";
import type { MessageRecord, PendingActionRecord } from "@/lib/assistant/types";
import type { AnalyticsOverview } from "@/lib/analytics/types";

interface AssistantMessageProps {
  message: MessageRecord;
  pendingAction?: PendingActionRecord | null;
  confirming?: boolean;
  onConfirmAction?: () => void;
  onCancelAction?: () => void;
  onFollowUp?: (prompt: string) => void;
  statusUpdates?: string[];
}

export function AssistantMessage({
  message,
  pendingAction,
  confirming,
  onConfirmAction,
  onCancelAction,
  onFollowUp,
  statusUpdates,
}: AssistantMessageProps) {
  const reduceMotion = useReducedMotion();
  const contentDraft = extractContentDraft(message.toolCalls);
  const strategyPlan = extractStrategyPlan(message.toolCalls);
  const reportContext = extractReportContext(message.toolCalls);
  const repurpose = extractRepurposeResult(message.toolCalls);
  const contentCreated = extractContentCreated(message.toolCalls);
  const analyticsData = extractAnalyticsOverview(message.toolCalls) as
    | AnalyticsOverview
    | null;

  const analyticsProps = analyticsData?.summary
    ? {
        totals: {
          reach: analyticsData.summary.reach,
          engagement: analyticsData.summary.engagement,
          impressions: analyticsData.summary.impressions,
        },
        period: { label: "Analytics overview" },
      }
    : null;

  const createdAt = message.createdAt
    ? new Date(message.createdAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <motion.div
      className="flex w-full min-w-0 justify-start"
      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <CopilotResponseFrame>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Copilot
          </p>
          {createdAt && (
            <time
              dateTime={message.createdAt}
              className="text-[10px] text-muted-foreground/80"
            >
              {createdAt}
            </time>
          )}
        </div>

        {statusUpdates && statusUpdates.length > 0 && (
          <ToolActivity statuses={statusUpdates} />
        )}
        {analyticsProps && <AnalyticsResult data={analyticsProps} />}
        {reportContext && (
          <ReportAnalysisCard
            reportName={reportContext.reportName}
            period={reportContext.period ?? null}
            highlights={reportContext.highlights}
          />
        )}
        {strategyPlan && (
          <StrategyPlanCard
            plan={strategyPlan}
            onReview={
              onFollowUp
                ? () =>
                    onFollowUp(
                      `Review strategy plan ${strategyPlan.planId} and suggest improvements.`
                    )
                : undefined
            }
          />
        )}
        {repurpose && (
          <ContentRepurposeCard
            sourceContentId={repurpose.sourceContentId}
            targetPlatform={repurpose.targetPlatform}
            creative={repurpose.creative}
            onRefine={
              onFollowUp
                ? () => onFollowUp("Refine this repurposed draft.")
                : undefined
            }
            onVariation={
              onFollowUp
                ? () =>
                    onFollowUp(
                      "Create another variation of this repurposed draft."
                    )
                : undefined
            }
          />
        )}
        {contentCreated && (
          <ContentCreatedCard
            count={contentCreated.count}
            contentIds={contentCreated.contentIds}
          />
        )}
        {contentDraft?.creative && !repurpose && (
          <ContentResultCard
            creative={contentDraft.creative}
            onRefine={
              onFollowUp
                ? () =>
                    onFollowUp(
                      "Refine the last content draft. Keep the same platform and goal but improve clarity, hook strength, and CTA."
                    )
                : undefined
            }
            onVariation={
              onFollowUp
                ? () =>
                    onFollowUp(
                      "Create 3 variations of the last content draft with different angles. Present each as a short draft."
                    )
                : undefined
            }
          />
        )}
        <div className="prose-copilot text-sm leading-relaxed text-foreground/95">
          <SafeMarkdown content={message.content} />
        </div>
        {pendingAction && onConfirmAction && onCancelAction && (
          <PendingActionCard
            action={pendingAction}
            confirming={confirming}
            onConfirm={onConfirmAction}
            onCancel={onCancelAction}
          />
        )}
      </CopilotResponseFrame>
    </motion.div>
  );
}
