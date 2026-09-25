import { NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/workspaces/context";
import { verifyClientWorkspaceAccess } from "@/lib/workspaces/access";
import { CLIENT_WORKSPACE_COOKIE } from "@/lib/workspaces/constants";

export async function POST(request: Request) {
  const auth = await requireWorkspaceContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as { clientWorkspaceId?: string | null };
  const clientWorkspaceId = body.clientWorkspaceId ?? null;

  const response = NextResponse.json({ ok: true });

  if (!clientWorkspaceId) {
    response.cookies.set(CLIENT_WORKSPACE_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  if (!auth.workspace.isAgency) {
    return NextResponse.json(
      { error: "Client workspaces are only available for agency accounts." },
      { status: 400 }
    );
  }

  try {
    await verifyClientWorkspaceAccess(
      auth.supabase,
      auth.workspace.organizationId,
      auth.user.id,
      clientWorkspaceId
    );
  } catch {
    return NextResponse.json(
      { error: "You do not have access to this client workspace." },
      { status: 403 }
    );
  }

  response.cookies.set(CLIENT_WORKSPACE_COOKIE, clientWorkspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
