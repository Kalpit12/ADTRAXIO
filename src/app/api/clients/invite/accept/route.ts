import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/social/auth-context";
import { CLIENT_WORKSPACE_COOKIE } from "@/lib/workspaces/constants";
import {
  acceptClientInvitation,
  ClientWorkspaceError,
} from "@/lib/workspaces/service";

export async function POST(request: Request) {
  const auth = await requireAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as { token?: string };
    if (!body.token?.trim()) {
      return NextResponse.json({ error: "Invitation token is required." }, { status: 400 });
    }

    const result = await acceptClientInvitation(auth.supabase, {
      token: body.token.trim(),
      userId: auth.user.id,
      userEmail: auth.user.email ?? null,
    });

    const response = NextResponse.json({
      ok: true,
      clientWorkspaceId: result.clientWorkspaceId,
    });

    response.cookies.set(CLIENT_WORKSPACE_COOKIE, result.clientWorkspaceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error) {
    if (error instanceof ClientWorkspaceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Unable to accept invitation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
