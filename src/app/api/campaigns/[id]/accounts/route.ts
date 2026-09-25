import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import { CampaignValidationError } from "@/lib/campaigns/validation";
import { attachCampaignAccount } from "@/lib/campaigns/service";

export async function POST(
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
    const body = (await request.json()) as { socialAccountId?: string };
    if (!body.socialAccountId) {
      return NextResponse.json(
        { error: "socialAccountId is required." },
        { status: 400 }
      );
    }

    await attachCampaignAccount(
      auth.supabase,
      auth.organizationId,
      id,
      body.socialAccountId,
      auth.scope
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CampaignValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Unable to attach account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
