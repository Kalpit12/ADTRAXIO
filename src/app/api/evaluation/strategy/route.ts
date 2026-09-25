import { NextResponse } from "next/server";
import { requireEvaluationView } from "@/lib/evaluation/api-auth";
import {
  getEvaluationForExecutionPlan,
  getEvaluationForStrategicPlan,
  listEvaluatedStrategies,
} from "@/lib/evaluation/service";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

export async function GET(request: Request) {
  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  const url = new URL(request.url);
  const strategicPlanId = url.searchParams.get("strategicPlanId");
  const executionPlanId = url.searchParams.get("executionPlanId");
  const listOnly = url.searchParams.get("list") === "evaluated";

  try {
    const { ctx } = requireEvaluationView(auth);
    if (executionPlanId) {
      const evaluation = await getEvaluationForExecutionPlan(ctx, executionPlanId);
      return NextResponse.json({ evaluation: evaluation ?? null });
    }
    if (strategicPlanId) {
      const evaluation = await getEvaluationForStrategicPlan(ctx, strategicPlanId);
      if (!evaluation) {
        return NextResponse.json({ evaluation: null });
      }
      return NextResponse.json({ evaluation });
    }
    if (listOnly) {
      const limit = Number(url.searchParams.get("limit") ?? 10);
      const evaluations = await listEvaluatedStrategies(
        ctx,
        Math.min(Math.max(limit, 1), 20)
      );
      return NextResponse.json({ evaluations });
    }
    return NextResponse.json(
      { error: "Provide strategicPlanId or list=evaluated." },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load strategy evaluation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
