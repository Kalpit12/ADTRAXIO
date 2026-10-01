import { NextResponse } from "next/server";
import { CampaignValidationError } from "@/lib/campaigns/validation";
import { parseCreativeStudioSnapshot } from "@/lib/content/creative-studio";
import { prepareCreativeForCampaign } from "@/lib/content/creative-campaign-service";
import { sanitizeCampaignIntegrationError } from "@/lib/content/creative-campaign";
import { parseStudioVisualState } from "@/lib/content/visual-types";
import { validateCreativeBrief } from "@/lib/content/validation";
import type { CreativeBrief } from "@/lib/content/types";
import { toClientError } from "@/lib/publishing/errors";
import { hasClientPermission } from "@/lib/workspaces/permissions";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";

export async function POST(request: Request) {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  if (
    !hasClientPermission(auth.workspace.clientRole, "campaigns.edit", {
      orgRole: auth.workspace.orgRole,
    }) ||
    !hasClientPermission(auth.workspace.clientRole, "content.edit", {
      orgRole: auth.workspace.orgRole,
    })
  ) {
    return NextResponse.json(
      { error: "You do not have permission to add creative to campaigns." },
      { status: 403 }
    );
  }

  let body: {
    campaignId?: string;
    brief?: CreativeBrief;
    studio?: unknown;
    visualAssets?: unknown;
    selectedMediaAssetId?: string | null;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.campaignId) {
    return NextResponse.json({ error: "Campaign is required." }, { status: 400 });
  }

  const briefErrors = body.brief ? validateCreativeBrief(body.brief) : { topic: "Required" };
  if (Object.keys(briefErrors).length > 0) {
    return NextResponse.json(
      { error: "Creative brief is incomplete." },
      { status: 400 }
    );
  }

  const studio = parseCreativeStudioSnapshot(body.studio);
  const visualState = parseStudioVisualState({
    assets: body.visualAssets ?? [],
  });

  try {
    const result = await prepareCreativeForCampaign({
      supabase: auth.supabase,
      organizationId: auth.organizationId,
      userId: auth.user.id,
      clientWorkspaceId: auth.scope.isAgency
        ? auth.scope.clientWorkspaceId
        : null,
      scope: auth.scope,
      campaignId: body.campaignId,
      brief: body.brief as CreativeBrief,
      studio,
      visualAssets: visualState.assets,
      selectedMediaAssetId: body.selectedMediaAssetId,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CampaignValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const client = toClientError(error);
    return NextResponse.json(
      {
        error: sanitizeCampaignIntegrationError(client.message),
        code: client.code,
      },
      { status: client.status }
    );
  }
}
