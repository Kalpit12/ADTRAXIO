import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/social/auth-context";
import {
  ClientWorkspaceError,
  createClientWorkspace,
  listClientWorkspaces,
} from "@/lib/workspaces/service";

export async function GET() {
  const auth = await requireAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!auth.workspace.isAgency) {
    return NextResponse.json(
      { error: "Client management is only available for agency accounts." },
      { status: 403 }
    );
  }

  try {
    const clients = await listClientWorkspaces(
      auth.supabase,
      auth.organizationId
    );
    return NextResponse.json({ clients });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load clients.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!auth.workspace.isAgency) {
    return NextResponse.json(
      { error: "Client management is only available for agency accounts." },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      slug?: string;
      initialOwnerEmail?: string;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Client name is required." }, { status: 400 });
    }

    const client = await createClientWorkspace(auth.supabase, {
      organizationId: auth.organizationId,
      userId: auth.user.id,
      name: body.name,
      description: body.description,
      slug: body.slug,
      initialOwnerEmail: body.initialOwnerEmail,
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    if (error instanceof ClientWorkspaceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Unable to create client.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
