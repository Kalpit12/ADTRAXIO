import { NextResponse } from "next/server";
import { requireLearningView } from "@/lib/learning/api-auth";
import { getLearningOutcome } from "@/lib/learning/service";
import { isValidUuid } from "@/lib/assistant/resource-scope";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

export async function GET(
  _request: Request,
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

  try {
    const { ctx } = requireLearningView(auth);
    const outcome = await getLearningOutcome(ctx, id);
    if (!outcome) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ outcome });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load learning outcome.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
