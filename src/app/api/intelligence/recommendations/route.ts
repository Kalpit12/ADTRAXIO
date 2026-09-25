import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import { listRecommendations } from "@/lib/intelligence/service";

export async function GET(request: Request) {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  const { searchParams } = new URL(request.url);

  try {
    const recommendations = await listRecommendations(
      auth.supabase,
      auth.organizationId,
      auth.scope,
      {
        status: searchParams.get("status"),
        type: searchParams.get("type"),
        priority: searchParams.get("priority"),
        campaignId: searchParams.get("campaignId"),
      }
    );

    return NextResponse.json({ recommendations });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load recommendations.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
