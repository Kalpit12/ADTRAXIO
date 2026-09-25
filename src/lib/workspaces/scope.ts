import type { WorkspaceContext } from "./types";

export type WorkspaceScope = {
  isAgency: boolean;
  clientWorkspaceId: string | null;
};

export const LEGACY_WORKSPACE_SCOPE: WorkspaceScope = {
  isAgency: false,
  clientWorkspaceId: null,
};

export function workspaceScopeFromContext(workspace: WorkspaceContext): WorkspaceScope {
  return {
    isAgency: workspace.isAgency,
    clientWorkspaceId: workspace.clientWorkspaceId,
  };
}

export function clientWorkspaceInsertValue(workspace: WorkspaceContext): string | null {
  if (!workspace.isAgency) return null;
  return workspace.clientWorkspaceId;
}
