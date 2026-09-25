import { assistantContextFromAuth } from "@/lib/assistant/context";
import type { requireScopedAuth } from "@/lib/workspaces/api-auth";
import {
  assertStrategistEdit,
  assertStrategistPrepare,
  assertStrategistView,
} from "./permissions";

type Scoped = Awaited<ReturnType<typeof requireScopedAuth>>;

export function strategistFromScopedAuth(
  auth: Extract<Scoped, { organizationId: string }>
) {
  const ctx = assistantContextFromAuth({
    supabase: auth.supabase,
    user: auth.user,
    organizationId: auth.organizationId,
    scope: auth.scope,
    workspace: auth.workspace,
  });
  return {
    ctx,
    clientRole: auth.workspace.clientRole,
    orgRole: auth.workspace.orgRole,
  };
}

export function requireStrategistView(auth: Extract<Scoped, { organizationId: string }>) {
  const bundle = strategistFromScopedAuth(auth);
  assertStrategistView(bundle.clientRole, bundle.orgRole);
  return bundle;
}

export function requireStrategistEdit(auth: Extract<Scoped, { organizationId: string }>) {
  const bundle = strategistFromScopedAuth(auth);
  assertStrategistEdit(bundle.clientRole, bundle.orgRole);
  return bundle;
}

export function requireStrategistPrepare(auth: Extract<Scoped, { organizationId: string }>) {
  const bundle = strategistFromScopedAuth(auth);
  assertStrategistPrepare(bundle.clientRole, bundle.orgRole);
  return bundle;
}
