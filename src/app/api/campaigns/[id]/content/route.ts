import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import { CampaignValidationError } from "@/lib/campaigns/validation";
import { attachCampaignContent } from "@/lib/campaigns/service";

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
    const body = (await request.json()) as { contentId?: string };
    if (!body.contentId) {
      return NextResponse.json({ error: "contentId is required." }, { status: 400 });
    }

    await attachCampaignContent(
      auth.supabase,
      auth.organizationId,
      id,
      body.contentId,
      auth.scope
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CampaignValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Unable to attach content.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
