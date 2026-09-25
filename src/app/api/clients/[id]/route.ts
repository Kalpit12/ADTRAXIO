import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/social/auth-context";
import { verifyClientWorkspaceAccess } from "@/lib/workspaces/access";
import {
  ClientWorkspaceError,
  getClientWorkspace,
  updateClientWorkspace,
} from "@/lib/workspaces/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const client = await getClientWorkspace(
      auth.supabase,
      auth.organizationId,
      id
    );
    if (!client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }
    return NextResponse.json({ client });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load client.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const access = await verifyClientWorkspaceAccess(
      auth.supabase,
      auth.organizationId,
      auth.user.id,
      id
    );

    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
      status?: "active" | "archived";
    };

    const client = await updateClientWorkspace(auth.supabase, {
      organizationId: auth.organizationId,
      userId: auth.user.id,
      clientId: id,
      name: body.name,
      description: body.description,
      status: body.status,
      clientRole: access.role,
      orgRole: access.orgRole,
    });

    return NextResponse.json({ client });
  } catch (error) {
    if (error instanceof ClientWorkspaceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Unable to update client.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
