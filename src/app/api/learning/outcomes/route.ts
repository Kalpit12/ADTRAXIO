import { NextResponse } from "next/server";
import { requireLearningView } from "@/lib/learning/api-auth";
import { listLearningOutcomes } from "@/lib/learning/service";
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
  const status = url.searchParams.get("status") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 20);

  try {
    const { ctx } = requireLearningView(auth);
    const outcomes = await listLearningOutcomes(ctx, {
      limit: Math.min(Math.max(limit, 1), 50),
      status: status as import("@/lib/learning/types").LearningOutcomeStatus | undefined,
    });
    return NextResponse.json({ outcomes });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to list learning outcomes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
