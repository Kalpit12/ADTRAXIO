import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";

export async function GET() {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  try {
    let query = auth.supabase
      .from("content")
      .select("id, headline, platform, content_type, status, updated_at")
      .eq("organization_id", auth.organizationId)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(50);

    if (!auth.scope.isAgency) {
      query = query.is("client_workspace_id", null);
    } else if (auth.scope.clientWorkspaceId) {
      query = query.eq("client_workspace_id", auth.scope.clientWorkspaceId);
    } else {
      query = query.eq(
        "client_workspace_id",
        "00000000-0000-0000-0000-000000000000"
      );
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return NextResponse.json({
      content:
        data?.map((row) => ({
          id: row.id,
          headline: row.headline,
          platform: row.platform,
          contentType: row.content_type,
          status: row.status,
          updatedAt: row.updated_at,
        })) ?? [],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load content.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
