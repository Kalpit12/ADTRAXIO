import { assistantContextFromAuth } from "@/lib/assistant/context";
import type { requireScopedAuth } from "@/lib/workspaces/api-auth";
import {
  assertExperimentApprove,
  assertExperimentEdit,
  assertExperimentStart,
  assertExperimentView,
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

export function requireExperimentView(auth: Extract<Scoped, { organizationId: string }>) {
  const b = bundle(auth);
  assertExperimentView(b.clientRole, b.orgRole);
  return b;
}

export function requireExperimentEdit(auth: Extract<Scoped, { organizationId: string }>) {
  const b = bundle(auth);
  assertExperimentEdit(b.clientRole, b.orgRole);
  return b;
}

export function requireExperimentApprove(auth: Extract<Scoped, { organizationId: string }>) {
  const b = bundle(auth);
  assertExperimentApprove(b.clientRole, b.orgRole);
  return b;
}

export function requireExperimentStart(auth: Extract<Scoped, { organizationId: string }>) {
  const b = bundle(auth);
  assertExperimentStart(b.clientRole, b.orgRole);
  return b;
}
