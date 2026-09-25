import { NextResponse } from "next/server";
import { isValidUuid } from "@/lib/assistant/resource-scope";
import { requireExperimentView } from "@/lib/experiments/api-auth";
import { getExperiment } from "@/lib/experiments/service";
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
    const { ctx } = requireExperimentView(auth);
    const experiment = await getExperiment(ctx, id);
    if (!experiment) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ experiment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load experiment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
