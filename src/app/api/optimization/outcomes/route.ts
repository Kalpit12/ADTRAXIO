import { NextResponse } from "next/server";
import { listOptimizationOutcomeHistory } from "@/lib/optimization/outcome";
import { requireOptimizationView } from "@/lib/optimization/api-auth";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

export async function GET(request: Request) {
  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }
  const { ctx } = requireOptimizationView(auth);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const experimentId = url.searchParams.get("experiment") ?? undefined;
  const platform = url.searchParams.get("platform") ?? undefined;
  const metric = url.searchParams.get("metric") ?? undefined;
  const dateFrom = url.searchParams.get("dateFrom") ?? undefined;
  const dateTo = url.searchParams.get("dateTo") ?? undefined;
  const limit = url.searchParams.get("limit");
  const outcomes = await listOptimizationOutcomeHistory(ctx, {
    status,
    experimentId,
    platform,
    metric,
    dateFrom,
    dateTo,
    limit: limit ? Number(limit) : 40,
  });
  return NextResponse.json({ outcomes });
}
