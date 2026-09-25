import { assistantContextFromAuth } from "../context";
import { assertBrandBrainEdit, assertBrandBrainView } from "./permissions";
import type { requireScopedAuth } from "@/lib/workspaces/api-auth";

type Scoped = Awaited<ReturnType<typeof requireScopedAuth>>;

export function brandBrainFromScopedAuth(auth: Extract<Scoped, { organizationId: string }>) {
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

export function requireBrandView(auth: Extract<Scoped, { organizationId: string }>) {
  const bundle = brandBrainFromScopedAuth(auth);
  assertBrandBrainView(bundle.clientRole, bundle.orgRole);
  return bundle;
}

export function requireBrandEdit(auth: Extract<Scoped, { organizationId: string }>) {
  const bundle = brandBrainFromScopedAuth(auth);
  assertBrandBrainEdit(bundle.clientRole, bundle.orgRole);
  return bundle;
}
