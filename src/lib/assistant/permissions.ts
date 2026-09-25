import type { WorkspaceScope } from "@/lib/workspaces/scope";
import type { ToolRiskLevel } from "./types";

export class AssistantPermissionError extends Error {
  readonly status = 403;

  constructor(message: string) {
    super(message);
    this.name = "AssistantPermissionError";
  }
}

export function ensureOperationalScope(scope: WorkspaceScope): void {
  if (scope.isAgency && !scope.clientWorkspaceId) {
    throw new AssistantPermissionError(
      "Select a client workspace to access client-specific data."
    );
  }
}

export function canExecuteToolRisk(
  risk: ToolRiskLevel,
  confirmed: boolean
): boolean {
  if (risk === "read") return true;
  return confirmed;
}
