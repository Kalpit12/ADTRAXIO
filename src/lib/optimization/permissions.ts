import { requireClientPermission } from "@/lib/workspaces/permissions";
import type { ClientRole } from "@/lib/workspaces/types";

export function assertOptimizationView(role: ClientRole | null, orgRole: string | null) {
  requireClientPermission(role, "client.view", { orgRole });
}

export function assertOptimizationEdit(role: ClientRole | null, orgRole: string | null) {
  requireClientPermission(role, "content.edit", { orgRole });
}

export function assertOptimizationApprove(role: ClientRole | null, orgRole: string | null) {
  requireClientPermission(role, "content.edit", { orgRole });
}

export function assertOptimizationExecute(role: ClientRole | null, orgRole: string | null) {
  requireClientPermission(role, "content.edit", { orgRole });
}
