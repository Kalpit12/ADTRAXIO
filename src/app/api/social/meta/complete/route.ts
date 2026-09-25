import { NextResponse } from "next/server";
import { checkProjectedLimit } from "@/lib/billing/entitlements";
import { EntitlementError } from "@/lib/billing/errors";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import {
  connectSelectedAccounts,
  deletePendingConnection,
  getPendingConnection,
} from "@/lib/social/service";

export async function POST(request: Request) {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const sessionId = String(raw.sessionId ?? "");
  const selectedSelectionIds = Array.isArray(raw.selectedSelectionIds)
    ? raw.selectedSelectionIds.map((id) => String(id))
    : [];

  if (!sessionId || selectedSelectionIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one account to connect." },
      { status: 400 }
    );
  }

  const payload = await getPendingConnection(
    auth.supabase,
    sessionId,
    auth.user.id
  );

  if (!payload) {
    return NextResponse.json(
      { error: "Connection session expired. Try again." },
      { status: 404 }
    );
  }

  try {
    const { count } = await auth.supabase
      .from("social_accounts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", auth.organizationId)
      .eq("status", "connected");

    await checkProjectedLimit(
      auth.supabase,
      auth.organizationId,
      "social_accounts",
      (count ?? 0) + selectedSelectionIds.length
    );

    const result = await connectSelectedAccounts(auth.supabase, {
      organizationId: auth.organizationId,
      userId: auth.user.id,
      payload,
      selectedSelectionIds,
      clientWorkspaceId: auth.scope.clientWorkspaceId,
    });

    await deletePendingConnection(auth.supabase, sessionId, auth.user.id);

    return NextResponse.json({
      connected: result.connected,
      skipped: result.skipped,
    });
  } catch (error) {
    if (error instanceof EntitlementError) {
      return NextResponse.json(
        { error: error.message, code: "PLAN_LIMIT" },
        { status: error.status }
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to connect selected accounts.",
      },
      { status: 500 }
    );
  }
}
