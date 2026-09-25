import { assistantContextFromAuth } from "@/lib/assistant/context";
import type { requireScopedAuth } from "@/lib/workspaces/api-auth";
import { assertEvaluationView } from "./permissions";

type Scoped = Awaited<ReturnType<typeof requireScopedAuth>>;

export function requireEvaluationView(auth: Extract<Scoped, { organizationId: string }>) {
  const ctx = assistantContextFromAuth({
    supabase: auth.supabase,
    user: auth.user,
    organizationId: auth.organizationId,
    scope: auth.scope,
    workspace: auth.workspace,
  });
  assertEvaluationView(auth.workspace.clientRole, auth.workspace.orgRole);
  return { ctx };
}
