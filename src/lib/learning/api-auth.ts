import { assistantContextFromAuth } from "@/lib/assistant/context";
import type { requireScopedAuth } from "@/lib/workspaces/api-auth";
import { assertLearningMeasure, assertLearningView } from "./permissions";

type Scoped = Awaited<ReturnType<typeof requireScopedAuth>>;

export function learningFromScopedAuth(auth: Extract<Scoped, { organizationId: string }>) {
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

export function requireLearningView(auth: Extract<Scoped, { organizationId: string }>) {
  const bundle = learningFromScopedAuth(auth);
  assertLearningView(bundle.clientRole, bundle.orgRole);
  return bundle;
}

export function requireLearningMeasure(auth: Extract<Scoped, { organizationId: string }>) {
  const bundle = learningFromScopedAuth(auth);
  assertLearningMeasure(bundle.clientRole, bundle.orgRole);
  return bundle;
}
