import { NextResponse } from "next/server";
import { requireExperimentView } from "@/lib/experiments/api-auth";
import { listExperimentHistory } from "@/lib/experiments/intelligence";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

export async function GET(request: Request) {
  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }
  const url = new URL(request.url);
  try {
    const { ctx } = requireExperimentView(auth);
    const history = await listExperimentHistory(ctx, {
      limit: Number(url.searchParams.get("limit") ?? 40),
      platform: url.searchParams.get("platform") ?? undefined,
      metric: url.searchParams.get("metric") ?? undefined,
      objectiveContains: url.searchParams.get("objective") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
    });
    return NextResponse.json({ history });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load history.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
