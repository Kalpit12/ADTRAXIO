import { NextResponse } from "next/server";
import { checkLimit } from "@/lib/billing/entitlements";
import { EntitlementError } from "@/lib/billing/errors";
import { applyClientWorkspaceScope } from "@/lib/workspaces/query-scope";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import {
  CampaignValidationError,
  parseCreateCampaignBody,
} from "@/lib/campaigns/validation";
import { createCampaign, listCampaigns } from "@/lib/campaigns/service";

export async function GET(request: Request) {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const sort = searchParams.get("sort") as
    | "newest"
    | "oldest"
    | "name"
    | "status"
    | null;

  try {
    const campaigns = await listCampaigns(auth.supabase, auth.organizationId, {
      status,
      sort: sort ?? "newest",
      includeArchived: status === "archived",
      scope: auth.scope,
    });
    return NextResponse.json({ campaigns });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load campaigns.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  try {
    let countQuery = auth.supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", auth.organizationId)
      .neq("status", "archived");
    if (!auth.scope.isAgency) {
      countQuery = countQuery.is("client_workspace_id", null);
    } else if (auth.scope.clientWorkspaceId) {
      countQuery = countQuery.eq("client_workspace_id", auth.scope.clientWorkspaceId);
    } else {
      countQuery = countQuery.eq(
        "client_workspace_id",
        "00000000-0000-0000-0000-000000000000"
      );
    }
    const { count } = await countQuery;

    await checkLimit(
      auth.supabase,
      auth.organizationId,
      "campaigns",
      count ?? 0
    );

    const body = parseCreateCampaignBody(await request.json());
    const campaign = await createCampaign(
      auth.supabase,
      auth.organizationId,
      auth.user.id,
      body,
      auth.scope
    );
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof EntitlementError) {
      return NextResponse.json(
        { error: error.message, code: "PLAN_LIMIT" },
        { status: error.status }
      );
    }
    if (error instanceof CampaignValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Unable to create campaign.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
