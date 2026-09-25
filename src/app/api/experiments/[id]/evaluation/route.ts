import { NextResponse } from "next/server";
import { isValidUuid } from "@/lib/assistant/resource-scope";
import { requireExperimentView } from "@/lib/experiments/api-auth";
import { getExperimentEvaluationDocument } from "@/lib/evaluation/experiment-run";
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
  const { ctx } = requireExperimentView(auth);
  const evaluation = await getExperimentEvaluationDocument(ctx, id);
  return NextResponse.json({ evaluation });
}
