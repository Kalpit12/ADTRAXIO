import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { assistantContextFromAuth } from "@/lib/assistant/context";
import { runStrategyEvaluation } from "@/lib/evaluation/service";
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

  const now = new Date().toISOString();
  const { data: due, error } = await supabase
    .from("ai_strategy_evaluations")
    .select("id, organization_id, client_workspace_id")
    .eq("evaluation_status", "pending")
    .lte("measure_after", now)
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let processed = 0;
  for (const row of due ?? []) {
    try {
      const ctx = assistantContextFromAuth({
        supabase,
        user: {
          id: "00000000-0000-0000-0000-000000000001",
          email: "cron@system",
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date(0).toISOString(),
        } as User,
        organizationId: row.organization_id,
        scope: workspaceScopeFromContext({
          organizationId: row.organization_id,
          organizationType: null,
          isAgency: Boolean(row.client_workspace_id),
          clientWorkspaceId: row.client_workspace_id,
          clientWorkspace: null,
          orgRole: "owner",
          clientRole: "manager",
        }),
        workspace: {
          isAgency: Boolean(row.client_workspace_id),
          clientWorkspaceId: row.client_workspace_id,
          orgRole: "owner",
          clientRole: "manager",
        },
      });
      await runStrategyEvaluation(ctx, row.id, { interpret: true });
      processed += 1;
    } catch {
      await supabase
        .from("ai_strategy_evaluations")
        .update({
          evaluation_status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    }
  }

  return NextResponse.json({ processed, due: due?.length ?? 0 });
}
