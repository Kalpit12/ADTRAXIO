import { NextResponse } from "next/server";
import { isValidUuid } from "@/lib/assistant/resource-scope";
import { requireExperimentEdit } from "@/lib/experiments/api-auth";
import { submitExperimentForReview } from "@/lib/experiments/service";
import { ExperimentValidationError } from "@/lib/experiments/validation";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

export async function POST(
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
    const { ctx } = requireExperimentEdit(auth);
    const experiment = await submitExperimentForReview(ctx, id);
    return NextResponse.json({ experiment });
  } catch (error) {
    if (error instanceof ExperimentValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unable to submit.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
