import { assistantContextFromAuth } from "@/lib/assistant/context";
import type { requireScopedAuth } from "@/lib/workspaces/api-auth";
import {
  assertOptimizationApprove,
  assertOptimizationEdit,
  assertOptimizationExecute,
  assertOptimizationView,
} from "./permissions";

type Scoped = Awaited<ReturnType<typeof requireScopedAuth>>;

function bundle(auth: Extract<Scoped, { organizationId: string }>) {
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

export function requireOptimizationView(auth: Extract<Scoped, { organizationId: string }>) {
  const b = bundle(auth);
  assertOptimizationView(b.clientRole, b.orgRole);
  return b;
}

export function requireOptimizationEdit(auth: Extract<Scoped, { organizationId: string }>) {
  const b = bundle(auth);
  assertOptimizationEdit(b.clientRole, b.orgRole);
  return b;
}

export function requireOptimizationApprove(auth: Extract<Scoped, { organizationId: string }>) {
  const b = bundle(auth);
  assertOptimizationApprove(b.clientRole, b.orgRole);
  return b;
}

export function requireOptimizationExecute(auth: Extract<Scoped, { organizationId: string }>) {
  const b = bundle(auth);
  assertOptimizationExecute(b.clientRole, b.orgRole);
  return b;
}
