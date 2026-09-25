import { requireClientPermission } from "@/lib/workspaces/permissions";
import type { ClientRole } from "@/lib/workspaces/types";

export function assertExperimentView(role: ClientRole | null, orgRole: string | null) {
  requireClientPermission(role, "client.view", { orgRole });
}

export function assertExperimentEdit(role: ClientRole | null, orgRole: string | null) {
  requireClientPermission(role, "content.edit", { orgRole });
}

export function assertExperimentApprove(role: ClientRole | null, orgRole: string | null) {
  requireClientPermission(role, "content.edit", { orgRole });
}

export function assertExperimentStart(role: ClientRole | null, orgRole: string | null) {
  requireClientPermission(role, "content.edit", { orgRole });
}
