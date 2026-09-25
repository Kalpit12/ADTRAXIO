import { NextResponse } from "next/server";
import { requireEvaluationView } from "@/lib/evaluation/api-auth";
import { getStrategyEvaluation } from "@/lib/evaluation/service";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  const { id } = await context.params;

  try {
    const { ctx } = requireEvaluationView(auth);
    const evaluation = await getStrategyEvaluation(ctx, id);
    if (!evaluation) {
      return NextResponse.json({ error: "Evaluation not found." }, { status: 404 });
    }
    return NextResponse.json({ evaluation });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load evaluation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
