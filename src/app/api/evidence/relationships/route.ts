import { NextResponse } from "next/server";
import { isValidUuid } from "@/lib/assistant/resource-scope";
import { getEvidenceRelationships } from "@/lib/evidence/graph";
import { requireExperimentView } from "@/lib/experiments/api-auth";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

export async function GET(request: Request) {
  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }
  const { ctx } = requireExperimentView(auth);
  const experimentId = new URL(request.url).searchParams.get("experimentId");
  if (!experimentId || !isValidUuid(experimentId)) {
    return NextResponse.json({ error: "experimentId is required." }, { status: 400 });
  }
  const relationships = await getEvidenceRelationships(ctx, experimentId);
  return NextResponse.json({ relationships });
}
