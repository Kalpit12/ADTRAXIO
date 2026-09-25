import { NextResponse } from "next/server";
import { requireStrategistPrepare } from "@/lib/strategist/api-auth";
import { prepareStrategicPlanExecution } from "@/lib/strategist/service";
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
    const { ctx } = requireStrategistPrepare(auth);
    const result = await prepareStrategicPlanExecution(ctx, id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StrategicPlanValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Unable to prepare execution plan.";
    const status = message.includes("permission") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
