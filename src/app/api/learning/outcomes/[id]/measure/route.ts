import { NextResponse } from "next/server";
import { requireLearningMeasure } from "@/lib/learning/api-auth";
import { measureLearningOutcome } from "@/lib/learning/service";
import { isValidUuid } from "@/lib/assistant/resource-scope";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  let force = false;
  try {
    const body = (await request.json()) as { force?: boolean };
    force = Boolean(body.force);
  } catch {
    /* empty */
  }

  try {
    const { ctx } = requireLearningMeasure(auth);
    const outcome = await measureLearningOutcome(ctx, id, {
      skipWindowCheck: force,
      interpret: true,
    });
    return NextResponse.json({ outcome });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to measure outcome.";
    const status = message.includes("window") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
