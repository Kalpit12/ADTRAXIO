import { NextResponse } from "next/server";
import {
  emptyMetrics,
  loadDashboardOverviewForOrg,
} from "@/lib/dashboard/load-overview";
import { workspaceScopeFromContext } from "@/lib/workspaces/scope";
import { requireWorkspaceContext } from "@/lib/workspaces/context";

function getFirstName(fullName: string | null, profileName: string | null) {
  const source = fullName?.trim() || profileName?.trim();
  if (!source) return "there";
  return source.split(/\s+/)[0] ?? "there";
}

export async function GET() {
  const auth = await requireWorkspaceContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, user, workspace } = auth;
  const scope = workspaceScopeFromContext(workspace);
  const orgId = workspace.organizationId;

  const [{ data: profile, error: profileError }, overview] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, profile_name, account_type")
      .eq("id", user.id)
      .maybeSingle(),
    loadDashboardOverviewForOrg(supabase, orgId, scope),
  ]);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const safeOverview = overview ?? {
    metrics: emptyMetrics(),
    performanceSeries: [],
    hasPerformanceData: false,
    activeCampaignCount: 0,
    campaigns: [],
    content: [],
    connectedAccounts: [],
  };

  return NextResponse.json({
    data: {
      user: {
        id: user.id,
        firstName: getFirstName(
          profile?.full_name ?? user.user_metadata?.full_name ?? null,
          profile?.profile_name ?? null
        ),
        fullName: profile?.full_name ?? user.user_metadata?.full_name ?? null,
        profileName: profile?.profile_name ?? null,
        accountType: profile?.account_type ?? null,
      },
      ...safeOverview,
    },
  });
}
