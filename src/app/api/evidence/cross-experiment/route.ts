import { NextResponse } from "next/server";
import { getCrossExperimentEvidence } from "@/lib/evidence/patterns";
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
  const url = new URL(request.url);
  const platform = url.searchParams.get("platform") ?? undefined;
  const metric = url.searchParams.get("metric") ?? undefined;
  const objectiveContains = url.searchParams.get("objectiveContains") ?? undefined;
  const limit = url.searchParams.get("limit");
  const evidence = await getCrossExperimentEvidence(ctx, {
    platform,
    metric,
    objectiveContains,
    limit: limit ? Number(limit) : undefined,
  });
  return NextResponse.json({ evidence });
}
