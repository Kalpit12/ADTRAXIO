import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import { toClientError } from "@/lib/analytics/errors";
import { getAnalyticsOverview } from "@/lib/analytics/service";

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
    const overview = await getAnalyticsOverview(auth.supabase, auth.organizationId, {
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      preset: searchParams.get("preset") as "7d" | "30d" | "90d" | "custom" | null,
      platform: searchParams.get("platform"),
      socialAccountId: searchParams.get("socialAccountId"),
      scope: auth.scope,
    });

    return NextResponse.json({ overview });
  } catch (error) {
    const clientError = toClientError(error);
    return NextResponse.json(
      { error: clientError.message, code: clientError.code },
      { status: clientError.status }
    );
  }
}
