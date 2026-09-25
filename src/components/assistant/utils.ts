import type { ConversationRecord, ToolCallResult } from "@/lib/assistant/types";
import type { GeneratedCreative } from "@/lib/content/types";

export type ConversationGroup = {
  label: string;
  conversations: ConversationRecord[];
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function groupConversations(
  conversations: ConversationRecord[]
): ConversationGroup[] {
  const now = startOfDay(new Date());
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const today: ConversationRecord[] = [];
  const yday: ConversationRecord[] = [];
  const week: ConversationRecord[] = [];
  const older: ConversationRecord[] = [];

  for (const conv of conversations) {
    const updated = startOfDay(new Date(conv.updatedAt));
    if (updated.getTime() === now.getTime()) {
      today.push(conv);
    } else if (updated.getTime() === yesterday.getTime()) {
      yday.push(conv);
    } else if (updated >= weekAgo) {
      week.push(conv);
    } else {
      older.push(conv);
    }
  }

  const groups: ConversationGroup[] = [];
  if (today.length) groups.push({ label: "Today", conversations: today });
  if (yday.length) groups.push({ label: "Yesterday", conversations: yday });
  if (week.length) groups.push({ label: "Previous 7 days", conversations: week });
  if (older.length) groups.push({ label: "Older", conversations: older });
  return groups;
}

export function parseToolCalls(toolCalls: unknown): ToolCallResult[] {
  if (!Array.isArray(toolCalls)) return [];
  return toolCalls.filter(
    (item): item is ToolCallResult =>
      item &&
      typeof item === "object" &&
      typeof (item as ToolCallResult).name === "string"
  );
}

export function extractContentDraft(
  toolCalls: unknown
): { brief?: Record<string, unknown>; creative?: GeneratedCreative } | null {
  const calls = parseToolCalls(toolCalls);
  for (const call of calls) {
    if (call.name !== "generate_content") continue;
    const result = call.result as {
      creative?: GeneratedCreative;
      brief?: Record<string, unknown>;
    } | null;
    if (result?.creative) {
      return { brief: result.brief, creative: result.creative };
    }
  }
  return null;
}

export function extractAnalyticsOverview(toolCalls: unknown): unknown | null {
  const calls = parseToolCalls(toolCalls);
  for (const call of calls) {
    if (call.name === "get_analytics_overview") {
      return call.result;
    }
  }
  return null;
}

export function extractStrategyPlan(toolCalls: unknown) {
  const calls = parseToolCalls(toolCalls);
  for (const call of calls) {
    if (
      call.name === "create_strategy_plan" ||
      call.name === "get_strategy_plan" ||
      call.name === "update_strategy_plan"
    ) {
      const result = call.result as Record<string, unknown> | null;
      if (!result || result.error) continue;
      const plan = (result.plan ?? result) as Record<string, unknown>;
      const planId =
        typeof result.planId === "string"
          ? result.planId
          : typeof plan.id === "string"
            ? plan.id
            : null;
      if (!planId) continue;
      return {
        planId,
        title:
          typeof result.title === "string"
            ? result.title
            : typeof plan.title === "string"
              ? plan.title
              : "Strategy plan",
        objective:
          typeof plan.objective === "string" ? plan.objective : undefined,
        platforms: Array.isArray(plan.platforms)
          ? (plan.platforms as string[])
          : undefined,
        contentPillars: Array.isArray(plan.contentPillars)
          ? (plan.contentPillars as Array<{ name: string; reason?: string }>)
          : undefined,
        cadence: typeof plan.cadence === "string" ? plan.cadence : undefined,
      };
    }
  }
  return null;
}

export function extractReportContext(toolCalls: unknown) {
  const calls = parseToolCalls(toolCalls);
  for (const call of calls) {
    if (call.name !== "get_report_context") continue;
    const result = call.result as Record<string, unknown> | null;
    if (!result || result.error) continue;
    const report = result.report as Record<string, unknown> | undefined;
    const overview = result.overview as Record<string, unknown> | undefined;
    if (!report) continue;
    const highlights = [
      {
        label: "Reach",
        value:
          overview?.reach != null ? String(overview.reach) : "",
      },
      {
        label: "Engagement",
        value:
          overview?.engagement != null ? String(overview.engagement) : "",
      },
      {
        label: "Impressions",
        value:
          overview?.impressions != null ? String(overview.impressions) : "",
      },
    ];
    return {
      reportName: String(report.name ?? "Report"),
      period: result.reportingPeriod as { from: string; to: string } | undefined,
      highlights,
    };
  }
  return null;
}

export function extractRepurposeResult(toolCalls: unknown) {
  const calls = parseToolCalls(toolCalls);
  for (const call of calls) {
    if (call.name !== "repurpose_content") continue;
    const result = call.result as {
      sourceContentId?: string;
      targetPlatform?: string;
      creative?: GeneratedCreative;
      error?: string;
    } | null;
    if (!result?.creative || result.error) continue;
    return {
      sourceContentId: result.sourceContentId ?? "",
      targetPlatform: result.targetPlatform ?? "",
      creative: result.creative,
    };
  }
  return null;
}

export function extractContentCreated(toolCalls: unknown) {
  const calls = parseToolCalls(toolCalls);
  for (const call of calls) {
    if (call.name !== "create_content_from_plan") continue;
    const result = call.result as {
      count?: number;
      contentIds?: string[];
      error?: string;
    } | null;
    if (!result || result.error) continue;
    return {
      count: result.count ?? result.contentIds?.length ?? 0,
      contentIds: result.contentIds,
    };
  }
  return null;
}

export function formatToolStatus(status: string): string {
  return status
    .replace(/^Running:\s*/i, "")
    .replace(/_/g, " ")
    .replace(/\.{3}$/, "")
    .trim();
}
