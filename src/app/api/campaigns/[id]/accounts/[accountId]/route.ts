import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import { CampaignValidationError } from "@/lib/campaigns/validation";
import { detachCampaignAccount } from "@/lib/campaigns/service";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; accountId: string }> }
) {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  const { id, accountId } = await context.params;

  try {
    await detachCampaignAccount(
      auth.supabase,
      auth.organizationId,
      id,
      accountId,
      auth.scope
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CampaignValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Unable to detach account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
