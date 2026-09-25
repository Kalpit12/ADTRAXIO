import { requireClientPermission } from "@/lib/workspaces/permissions";
import type { ClientRole } from "@/lib/workspaces/types";

export function assertStrategistView(role: ClientRole | null, orgRole: string | null) {
  requireClientPermission(role, "client.view", { orgRole });
}

export function assertStrategistEdit(role: ClientRole | null, orgRole: string | null) {
  requireClientPermission(role, "content.edit", { orgRole });
}

export function assertStrategistPrepare(role: ClientRole | null, orgRole: string | null) {
  requireClientPermission(role, "content.edit", { orgRole });
}
