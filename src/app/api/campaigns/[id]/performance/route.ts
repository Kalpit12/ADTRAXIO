import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import { CampaignValidationError } from "@/lib/campaigns/validation";
import { getCampaignPerformance } from "@/lib/campaigns/service";

export async function GET(
  _request: Request,
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
    const performance = await getCampaignPerformance(
      auth.supabase,
      auth.organizationId,
      id,
      auth.scope
    );
    return NextResponse.json({ performance });
  } catch (error) {
    if (error instanceof CampaignValidationError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    const message =
      error instanceof Error ? error.message : "Unable to load performance.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
