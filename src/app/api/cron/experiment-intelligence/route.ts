import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { assistantContextFromAuth } from "@/lib/assistant/context";
import { syncExperimentIntelligence } from "@/lib/experiments/intelligence";
import { measureRunningExperiment } from "@/lib/experiments/service";
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

  const now = Date.now();
  const { data: running } = await supabase
    .from("ai_experiments")
    .select("id, organization_id, client_workspace_id, started_at, minimum_observation_days, interpretation_status")
    .eq("status", "running")
    .limit(50);

  let measured = 0;
  let synced = 0;

  for (const row of running ?? []) {
    if (!row.started_at) continue;
    const endMs =
      new Date(row.started_at as string).getTime() +
      (row.minimum_observation_days as number) * 24 * 60 * 60 * 1000;
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
      organizationId: row.organization_id as string,
      scope: workspaceScopeFromContext({
        organizationId: row.organization_id as string,
        organizationType: null,
        isAgency: Boolean(row.client_workspace_id),
        clientWorkspaceId: row.client_workspace_id as string | null,
        clientWorkspace: null,
        orgRole: "owner",
        clientRole: "manager",
      }),
      workspace: {
        isAgency: Boolean(row.client_workspace_id),
        clientWorkspaceId: row.client_workspace_id as string | null,
        orgRole: "owner",
        clientRole: "manager",
      },
    });

    try {
      if (now >= endMs) {
        await measureRunningExperiment(ctx, row.id as string, { interpret: true });
        measured += 1;
      } else {
        await syncExperimentIntelligence(ctx, row.id as string, { runAi: false });
      }
      if (row.interpretation_status !== "complete") {
        await syncExperimentIntelligence(ctx, row.id as string, {
          runAi: now >= endMs,
        });
      }
      synced += 1;
    } catch {
      /* continue */
    }
  }

  const { data: completed } = await supabase
    .from("ai_experiments")
    .select("id, organization_id, client_workspace_id, interpretation_status")
    .eq("status", "completed")
    .neq("interpretation_status", "complete")
    .limit(30);

  for (const row of completed ?? []) {
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
      organizationId: row.organization_id as string,
      scope: workspaceScopeFromContext({
        organizationId: row.organization_id as string,
        organizationType: null,
        isAgency: Boolean(row.client_workspace_id),
        clientWorkspaceId: row.client_workspace_id as string | null,
        clientWorkspace: null,
        orgRole: "owner",
        clientRole: "manager",
      }),
      workspace: {
        isAgency: Boolean(row.client_workspace_id),
        clientWorkspaceId: row.client_workspace_id as string | null,
        orgRole: "owner",
        clientRole: "manager",
      },
    });
    try {
      await syncExperimentIntelligence(ctx, row.id as string, { runAi: true });
      synced += 1;
    } catch {
      /* continue */
    }
  }

  return NextResponse.json({ measured, synced });
}
