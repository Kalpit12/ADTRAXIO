import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import { toClientError } from "@/lib/analytics/errors";
import { syncOrganizationAnalytics } from "@/lib/analytics/service";

export async function POST() {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  try {
    const summary = await syncOrganizationAnalytics(
      auth.supabase,
      auth.organizationId
    );
    return NextResponse.json(summary);
  } catch (error) {
    const clientError = toClientError(error);
    return NextResponse.json(
      { error: clientError.message, code: clientError.code },
      { status: clientError.status }
    );
  }
}
