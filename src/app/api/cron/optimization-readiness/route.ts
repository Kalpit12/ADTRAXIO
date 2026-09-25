import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { assistantContextFromAuth } from "@/lib/assistant/context";
import { expireOptimizationProposals } from "@/lib/optimization/service";
import { syncPendingOptimizationOutcomes } from "@/lib/optimization/outcome";
import { logOperation } from "@/lib/observability/log";
import { workspaceScopeFromContext } from "@/lib/workspaces/scope";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const systemUser = {
    id: "00000000-0000-0000-0000-000000000002",
    email: "cron@system",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date(0).toISOString(),
  } as User;

  const { data: orgs } = await supabase.from("organizations").select("id").limit(50);
  let expired = 0;
  let outcomesSynced = 0;

  for (const org of orgs ?? []) {
    const organizationId = org.id as string;
    const ctx = assistantContextFromAuth({
      supabase,
      user: systemUser,
      organizationId,
      scope: workspaceScopeFromContext({
        organizationId,
        organizationType: null,
        isAgency: false,
        clientWorkspaceId: null,
        clientWorkspace: null,
        orgRole: "owner",
        clientRole: null,
      }),
      workspace: {
        isAgency: false,
        clientWorkspaceId: null,
        orgRole: "owner",
        clientRole: null,
      },
    });
    expired += await expireOptimizationProposals(ctx);
    outcomesSynced += await syncPendingOptimizationOutcomes(ctx);
  }

  const { data: agencyWorkspaces } = await supabase
    .from("client_workspaces")
    .select("id, organization_id")
    .limit(100);
  for (const ws of agencyWorkspaces ?? []) {
    const organizationId = ws.organization_id as string;
    const ctx = assistantContextFromAuth({
      supabase,
      user: systemUser,
      organizationId,
      scope: workspaceScopeFromContext({
        organizationId,
        organizationType: "agency",
        isAgency: true,
        clientWorkspaceId: ws.id as string,
        clientWorkspace: null,
        orgRole: "owner",
        clientRole: "manager",
      }),
      workspace: {
        isAgency: true,
        clientWorkspaceId: ws.id as string,
        orgRole: "owner",
        clientRole: "manager",
      },
    });
    outcomesSynced += await syncPendingOptimizationOutcomes(ctx);
  }

  logOperation({
    operation: "cron.optimization-readiness",
    category: "cron",
    status: "ok",
    message: `expired=${expired} outcomesSynced=${outcomesSynced}`,
  });
  return NextResponse.json({ ok: true, expired, outcomesSynced });
}
