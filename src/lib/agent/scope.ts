import type { AssistantContext } from "@/lib/assistant/types";
import type { WorkspaceScope } from "@/lib/workspaces/scope";

const EMPTY_CLIENT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

export function clientWorkspaceIdForBrief(ctx: AssistantContext): string | null {
  return ctx.isAgency ? ctx.clientWorkspaceId : null;
}

export function scopeGrowthBriefQuery<
  T extends { is: (c: string, v: null) => T; eq: (c: string, v: string) => T },
>(query: T, ctx: AssistantContext): T {
  if (!ctx.isAgency) return query.is("client_workspace_id", null);
  if (ctx.clientWorkspaceId) {
    return query.eq("client_workspace_id", ctx.clientWorkspaceId);
  }
  return query.eq("client_workspace_id", EMPTY_CLIENT_WORKSPACE_ID);
}

export function scopeGrowthBriefQueryByScope<
  T extends { is: (c: string, v: null) => T; eq: (c: string, v: string) => T },
>(query: T, scope: WorkspaceScope): T {
  if (!scope.isAgency) return query.is("client_workspace_id", null);
  if (scope.clientWorkspaceId) {
    return query.eq("client_workspace_id", scope.clientWorkspaceId);
  }
  return query.eq("client_workspace_id", EMPTY_CLIENT_WORKSPACE_ID);
}
