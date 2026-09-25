import {
  requireAuthContext,
  requireOperationalAuthContext,
  type AuthContextResult,
} from "@/lib/social/auth-context";
import { workspaceScopeFromContext, type WorkspaceScope } from "./scope";

type AuthSuccess = Extract<AuthContextResult, { organizationId: string }>;

export type ScopedAuthResult =
  | (AuthSuccess & { scope: WorkspaceScope })
  | { error: string; status: number; code?: string };

export async function requireScopedAuth(): Promise<ScopedAuthResult> {
  const auth = await requireAuthContext();
  if ("error" in auth) return auth;
  return { ...auth, scope: workspaceScopeFromContext(auth.workspace) };
}

export async function requireOperationalScopedAuth(): Promise<ScopedAuthResult> {
  const auth = await requireOperationalAuthContext();
  if ("error" in auth) return auth;
  return { ...auth, scope: workspaceScopeFromContext(auth.workspace) };
}
