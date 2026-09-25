import { createNotification } from "@/lib/collaboration/notifications";
import type { AssistantContext } from "@/lib/assistant/types";
import type { GrowthBriefRecord } from "./types";

export async function maybeNotifyGrowthBrief(
  ctx: AssistantContext,
  brief: GrowthBriefRecord
): Promise<void> {
  const attentionInsights = brief.insights.filter(
    (i) => i.severity === "attention" || i.severity === "important"
  );
  const failedCount = brief.metrics.failedPostsCount ?? 0;
  const engagement = brief.metrics.engagementChangePercent;
  const meaningfulPerformance =
    engagement != null && Math.abs(engagement) >= 15;

  if (
    attentionInsights.length === 0 &&
    failedCount === 0 &&
    !meaningfulPerformance
  ) {
    return;
  }

  let title = "ADTRAXIO AI growth brief";
  let body = brief.summary.slice(0, 240);

  if (failedCount > 0) {
    title = `${failedCount} scheduled post${failedCount === 1 ? "" : "s"} failed`;
    body = "Review publishing issues in your latest growth brief.";
  } else if (meaningfulPerformance && engagement != null) {
    title = "ADTRAXIO AI found a meaningful performance change";
    body = `Engagement ${engagement > 0 ? "up" : "down"} ${Math.abs(engagement)}%. ${brief.summary.slice(0, 120)}`;
  } else if (attentionInsights[0]) {
    title = attentionInsights[0].title;
    body = attentionInsights[0].observation.slice(0, 240);
  }

  await createNotification(ctx.supabase, {
    organizationId: ctx.organizationId,
    recipientId: ctx.user.id,
    clientWorkspaceId: ctx.clientWorkspaceId,
    type: "growth_brief",
    title,
    body,
    entityType: "ai_growth_brief",
    entityId: brief.id,
  });
}
