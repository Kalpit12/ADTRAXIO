import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import type { ScopedAuthResult } from "@/lib/workspaces/api-auth";
import { CollaborationError } from "./errors";
import { collaborationContextFromAuth } from "./service";
import type { CollaborationContext } from "./types";

export type CollaborationAuth = Extract<ScopedAuthResult, { organizationId: string }> & {
  ctx: CollaborationContext;
};

export async function requireCollaborationAuth(): Promise<
  CollaborationAuth | NextResponse
> {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  return {
    ...auth,
    ctx: collaborationContextFromAuth(auth),
  };
}

export function handleCollaborationError(error: unknown) {
  if (error instanceof CollaborationError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }
  const message = error instanceof Error ? error.message : "Request failed.";
  return NextResponse.json({ error: message }, { status: 500 });
}
