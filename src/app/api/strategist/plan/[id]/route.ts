import { NextResponse } from "next/server";
import {
  requireStrategistEdit,
  requireStrategistView,
} from "@/lib/strategist/api-auth";
import {
  getStrategicPlan,
  isStrategicPlanExpired,
  updateStrategicPlanActions,
} from "@/lib/strategist/service";
import { StrategicPlanValidationError } from "@/lib/strategist/validation";
import { isValidUuid } from "@/lib/assistant/resource-scope";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
  }

  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  try {
    const { ctx } = requireStrategistView(auth);
    const plan = await getStrategicPlan(ctx, id);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }
    return NextResponse.json({
      plan,
      expired: isStrategicPlanExpired(plan),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load strategic plan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
  }

  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  let body: {
    actionPatches?: Array<{
      actionId: string;
      reviewStatus?: "pending" | "approved" | "rejected";
      title?: string;
      instructions?: string;
    }>;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.actionPatches?.length) {
    return NextResponse.json({ error: "actionPatches required." }, { status: 400 });
  }

  try {
    const { ctx } = requireStrategistEdit(auth);
    const plan = await updateStrategicPlanActions(ctx, id, body.actionPatches);
    return NextResponse.json({ plan });
  } catch (error) {
    if (error instanceof StrategicPlanValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Unable to update strategic plan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
