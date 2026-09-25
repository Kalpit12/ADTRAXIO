import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import {
  IntelligenceValidationError,
  updateRecommendationStatus,
  validateRecommendationStatus,
} from "@/lib/intelligence/service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  const { id } = await context.params;

  try {
    const body = (await request.json()) as { status?: string };
    const status = validateRecommendationStatus(body.status);

    const recommendation = await updateRecommendationStatus(
      auth.supabase,
      auth.organizationId,
      auth.scope,
      id,
      status
    );

    return NextResponse.json({ recommendation });
  } catch (error) {
    if (error instanceof IntelligenceValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Unable to update recommendation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
