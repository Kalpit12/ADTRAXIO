import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import {
  CampaignValidationError,
  parseUpdateCampaignBody,
} from "@/lib/campaigns/validation";
import {
  archiveCampaign,
  getCampaign,
  updateCampaign,
} from "@/lib/campaigns/service";

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
    const campaign = await getCampaign(
      auth.supabase,
      auth.organizationId,
      id,
      auth.scope
    );
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }
    return NextResponse.json({ campaign });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load campaign.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
    const updates = parseUpdateCampaignBody(await request.json());
    const campaign = await updateCampaign(
      auth.supabase,
      auth.organizationId,
      id,
      updates,
      auth.scope
    );
    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof CampaignValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Unable to update campaign.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
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
    await archiveCampaign(auth.supabase, auth.organizationId, id, auth.scope);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CampaignValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Unable to archive campaign.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
