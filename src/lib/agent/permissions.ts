import { requireClientPermission } from "@/lib/workspaces/permissions";
import type { ClientRole } from "@/lib/workspaces/types";

export function assertAgentView(role: ClientRole | null, orgRole: string | null) {
  requireClientPermission(role, "client.view", { orgRole });
}

export function assertAgentEdit(role: ClientRole | null, orgRole: string | null) {
  requireClientPermission(role, "content.edit", { orgRole });
}
