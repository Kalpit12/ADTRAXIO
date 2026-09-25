import { requireWorkspaceContext } from "@/lib/workspaces/context";
import type { WorkspaceContext } from "@/lib/workspaces/types";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AuthContextResult =
  | {
      supabase: SupabaseClient;
      user: User;
      organizationId: string;
      workspace: WorkspaceContext;
    }
  | { error: string; status: number; code?: string };

export async function requireAuthContext(): Promise<AuthContextResult> {
  const result = await requireWorkspaceContext();
  if ("error" in result) {
    return result;
  }

  return {
    supabase: result.supabase,
    user: result.user,
    organizationId: result.workspace.organizationId,
    workspace: result.workspace,
  };
}

/** Requires a selected client workspace when the org is an agency. */
export async function requireOperationalAuthContext(): Promise<AuthContextResult> {
  const result = await requireWorkspaceContext({ requireClient: true });
  if ("error" in result) {
    return result;
  }

  return {
    supabase: result.supabase,
    user: result.user,
    organizationId: result.workspace.organizationId,
    workspace: result.workspace,
  };
}
