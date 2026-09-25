import { NextResponse } from "next/server";
import { requireStrategistEdit } from "@/lib/strategist/api-auth";
import { cancelStrategicPlan } from "@/lib/strategist/service";
import { StrategicPlanValidationError } from "@/lib/strategist/validation";
import { isValidUuid } from "@/lib/assistant/resource-scope";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

export async function POST(
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
    const { ctx } = requireStrategistEdit(auth);
    const plan = await cancelStrategicPlan(ctx, id);
    return NextResponse.json({ plan });
  } catch (error) {
    if (error instanceof StrategicPlanValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Unable to cancel strategic plan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
