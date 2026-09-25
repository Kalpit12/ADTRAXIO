import { NextResponse } from "next/server";
import {
  listAccessibleWorkspaces,
  requireWorkspaceContext,
} from "@/lib/workspaces/context";

export async function GET() {
  const auth = await requireWorkspaceContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const accessible = await listAccessibleWorkspaces(
      auth.supabase,
      auth.workspace.organizationId,
      auth.user.id,
      auth.workspace.isAgency
    );

    return NextResponse.json({
      workspace: auth.workspace,
      accessible,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load workspace context.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
