import { NextResponse } from "next/server";
import { requireStrategistEdit } from "@/lib/strategist/api-auth";
import { createStrategicPlan } from "@/lib/strategist/service";
import { StrategicPlanValidationError } from "@/lib/strategist/validation";
import { StrategistAIError } from "@/lib/strategist/openai";
import { strategicPlanReviewUrl } from "@/lib/strategist/plan-builder";
import type { StrategyType } from "@/lib/strategist/types";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";

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
    strategyType?: StrategyType;
    growthBriefId?: string;
    instructions?: string;
    includeAlternatives?: boolean;
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
    const { ctx } = requireStrategistEdit(auth);
    const { plan, meta } = await createStrategicPlan(ctx, {
      objective,
      strategyType: body.strategyType,
      growthBriefId: body.growthBriefId,
      instructions: body.instructions,
      includeAlternatives: body.includeAlternatives,
    });
    return NextResponse.json({
      plan,
      reviewUrl: strategicPlanReviewUrl(plan.id),
      expired: false,
      learningCount: meta.learningCount,
      adaptationCount: meta.adaptationCount,
      learningIds: meta.learningIds,
    });
  } catch (error) {
    if (error instanceof StrategicPlanValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof StrategistAIError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    const message =
      error instanceof Error ? error.message : "Unable to create strategic plan.";
    const status = message.includes("permission") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
