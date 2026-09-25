import { NextResponse } from "next/server";
import { createAndPrepareExecutionPlan } from "@/lib/execution/orchestrate";
import { requireExecutionEdit } from "@/lib/execution/api-auth";
import {
  requireOperationalScopedAuth,
} from "@/lib/workspaces/api-auth";

export async function POST(request: Request) {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  let body: {
    objective?: string;
    growthBriefId?: string;
    recommendationIndex?: number;
    instructions?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const objective = body.objective?.trim();
  if (!objective) {
    return NextResponse.json({ error: "objective is required." }, { status: 400 });
  }

  try {
    const { ctx } = requireExecutionEdit(auth);
    const result = await createAndPrepareExecutionPlan(ctx, {
      objective,
      growthBriefId: body.growthBriefId,
      recommendationIndex: body.recommendationIndex,
      instructions: body.instructions,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create execution plan.";
    const status = message.includes("permission") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
