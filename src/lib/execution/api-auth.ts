import { assistantContextFromAuth } from "@/lib/assistant/context";
import type { requireScopedAuth } from "@/lib/workspaces/api-auth";
import {
  assertExecutionEdit,
  assertExecutionExecute,
  assertExecutionView,
} from "./permissions";

type Scoped = Awaited<ReturnType<typeof requireScopedAuth>>;

export function executionFromScopedAuth(
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

export function requireExecutionView(auth: Extract<Scoped, { organizationId: string }>) {
  const bundle = executionFromScopedAuth(auth);
  assertExecutionView(bundle.clientRole, bundle.orgRole);
  return bundle;
}

export function requireExecutionEdit(auth: Extract<Scoped, { organizationId: string }>) {
  const bundle = executionFromScopedAuth(auth);
  assertExecutionEdit(bundle.clientRole, bundle.orgRole);
  return bundle;
}

export function requireExecutionExecute(
  auth: Extract<Scoped, { organizationId: string }>
) {
  const bundle = executionFromScopedAuth(auth);
  assertExecutionExecute(bundle.clientRole, bundle.orgRole);
  return bundle;
}
