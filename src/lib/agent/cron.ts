import type { SupabaseClient } from "@supabase/supabase-js";
import { assistantContextFromAuth } from "@/lib/assistant/context";
import { generateGrowthBrief } from "./brief";
import type { GrowthBriefType } from "./types";

type ScopeRow = {
  organization_id: string;
  client_workspace_id: string | null;
  user_id: string;
};

/**
 * Generates briefs for workspaces with connected accounts.
 * Intended for Vercel cron (Bearer CRON_SECRET).
 */
export async function runGrowthBriefCron(
  supabase: SupabaseClient,
  briefType: GrowthBriefType
): Promise<{ processed: number; errors: number }> {
  const { data: accounts, error } = await supabase
    .from("social_accounts")
    .select("organization_id, client_workspace_id")
    .eq("status", "connected");

  if (error) throw new Error(error.message);

  const scopes = new Map<string, ScopeRow>();
  for (const row of accounts ?? []) {
    const key = `${row.organization_id}:${row.client_workspace_id ?? "org"}`;
    if (scopes.has(key)) continue;
    const { data: member } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", row.organization_id)
      .limit(1)
      .maybeSingle();
    if (!member?.user_id) continue;
    scopes.set(key, {
      organization_id: row.organization_id,
      client_workspace_id: row.client_workspace_id,
      user_id: member.user_id,
    });
  }

  let processed = 0;
  let errors = 0;

  for (const scope of scopes.values()) {
    try {
      const { data: user } = await supabase.auth.admin.getUserById(scope.user_id);
      if (!user.user) continue;

      const { data: org } = await supabase
        .from("organizations")
        .select("type")
        .eq("id", scope.organization_id)
        .maybeSingle();
      const isAgency = org?.type === "agency";
      const ctx = assistantContextFromAuth({
        supabase,
        user: user.user,
        organizationId: scope.organization_id,
        scope: {
          isAgency,
          clientWorkspaceId: scope.client_workspace_id,
        },
        workspace: {
          isAgency,
          clientWorkspaceId: scope.client_workspace_id,
          clientRole: null,
          orgRole: "owner",
        },
      });

      await generateGrowthBrief(ctx, briefType);
      processed += 1;
    } catch {
      errors += 1;
    }
  }

  return { processed, errors };
}
