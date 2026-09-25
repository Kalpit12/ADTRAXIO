import { assistantContextFromAuth } from "@/lib/assistant/context";
import type { requireScopedAuth } from "@/lib/workspaces/api-auth";
import { assertAgentEdit, assertAgentView } from "./permissions";

type Scoped = Awaited<ReturnType<typeof requireScopedAuth>>;

export function agentFromScopedAuth(auth: Extract<Scoped, { organizationId: string }>) {
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

export function requireAgentView(auth: Extract<Scoped, { organizationId: string }>) {
  const bundle = agentFromScopedAuth(auth);
  assertAgentView(bundle.clientRole, bundle.orgRole);
  return bundle;
}

export function requireAgentEdit(auth: Extract<Scoped, { organizationId: string }>) {
  const bundle = agentFromScopedAuth(auth);
  assertAgentEdit(bundle.clientRole, bundle.orgRole);
  return bundle;
}
