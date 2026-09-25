import { ensureOperationalScope } from "../permissions";
import { isValidUuid } from "../resource-scope";
import type { AssistantContext } from "../types";
import { formatEvaluationSummary } from "@/lib/evaluation/context";
import {
  getEvaluationForStrategicPlan,
  getStrategyEvaluation,
  listEvaluatedStrategies,
} from "@/lib/evaluation/service";

export async function getStrategyEvaluationTool(
  ctx: AssistantContext,
  args: {
    evaluationId?: string;
    strategicPlanId?: string;
    limit?: number;
  }
) {
  ensureOperationalScope(ctx.scope);

  if (args.evaluationId && isValidUuid(args.evaluationId)) {
    const evaluation = await getStrategyEvaluation(ctx, args.evaluationId);
    if (!evaluation) return { error: "Strategy evaluation not found." };
    return { evaluation: formatEvaluationSummary(evaluation), raw: evaluation };
  }

  if (args.strategicPlanId && isValidUuid(args.strategicPlanId)) {
    const evaluation = await getEvaluationForStrategicPlan(ctx, args.strategicPlanId);
    if (!evaluation) return { error: "No evaluation for this strategic plan yet." };
    return { evaluation: formatEvaluationSummary(evaluation), raw: evaluation };
  }

  const recent = await listEvaluatedStrategies(
    ctx,
    Math.min(args.limit ?? 3, 5)
  );
  if (!recent.length) {
    return {
      message: "No completed strategy evaluations yet.",
      evaluations: [],
    };
  }
  const latest = recent[0];
  return {
    evaluation: formatEvaluationSummary(latest),
    recentCount: recent.length,
    evaluations: recent.map((e) => ({
      id: e.id,
      strategicPlanId: e.strategicPlanId,
      objective: e.objective,
      status: e.status,
      confidence: e.confidence,
      measuredAt: e.measuredAt,
    })),
  };
}
