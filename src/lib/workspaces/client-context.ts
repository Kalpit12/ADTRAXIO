import type { WorkspaceContext } from "./types";

export async function fetchWorkspaceContext(): Promise<{
  workspace: WorkspaceContext | null;
  error?: string;
}> {
  try {
    const response = await fetch("/api/workspaces/context");
    const payload = (await response.json()) as {
      workspace?: WorkspaceContext;
      error?: string;
    };

    if (!response.ok) {
      return { workspace: null, error: payload.error };
    }

    return { workspace: payload.workspace ?? null };
  } catch {
    return { workspace: null, error: "Unable to load workspace context." };
  }
}
