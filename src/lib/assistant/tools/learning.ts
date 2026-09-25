import { ensureOperationalScope } from "../permissions";
import { isValidUuid } from "../resource-scope";
import type { AssistantContext } from "../types";
import {
  getLearningOutcome,
  listLearningOutcomes,
  listMeasuredLearnings,
} from "@/lib/learning/service";
import { formatLearningsForPrompt } from "@/lib/learning/context";

export async function getLearningOutcomesTool(
  ctx: AssistantContext,
  args: { limit?: number; status?: string }
) {
  ensureOperationalScope(ctx.scope);
  const outcomes = await listLearningOutcomes(ctx, {
    limit: Math.min(args.limit ?? 10, 20),
    status: args.status as import("@/lib/learning/types").LearningOutcomeStatus | undefined,
  });
  return {
    outcomes: outcomes.map((o) => ({
      id: o.id,
      status: o.status,
      confidence: o.confidence,
      objective: o.objective,
      platform: o.platform,
      measuredAt: o.measuredAt,
      summary: (o.learning as { summary?: string }).summary ?? null,
    })),
  };
}

export async function getLearningSummaryTool(ctx: AssistantContext) {
  ensureOperationalScope(ctx.scope);
  const measured = await listMeasuredLearnings(ctx, { limit: 8 });
  return {
    summary: formatLearningsForPrompt(measured),
    count: measured.length,
  };
}

export async function explainExecutionOutcomeTool(
  ctx: AssistantContext,
  args: { executionPlanId?: string; outcomeId?: string }
) {
  ensureOperationalScope(ctx.scope);
  if (args.outcomeId && isValidUuid(args.outcomeId)) {
    const outcome = await getLearningOutcome(ctx, args.outcomeId);
    if (!outcome) return { error: "Outcome not found." };
    return { outcome };
  }
  if (args.executionPlanId && isValidUuid(args.executionPlanId)) {
    const outcomes = await listLearningOutcomes(ctx, { limit: 20 });
    const related = outcomes.filter(
      (o) => o.executionPlanId === args.executionPlanId
    );
    return { outcomes: related };
  }
  return { error: "Provide outcomeId or executionPlanId." };
}
