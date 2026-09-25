import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/social/auth-context";
import { verifyClientWorkspaceAccess } from "@/lib/workspaces/access";
import { requireClientPermission } from "@/lib/workspaces/permissions";
import type { ClientRole } from "@/lib/workspaces/types";
import {
  createClientInvitation,
  listClientMembers,
  removeClientMember,
  updateClientMemberRole,
} from "@/lib/workspaces/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  try {
    await verifyClientWorkspaceAccess(
      auth.supabase,
      auth.organizationId,
      auth.user.id,
      id
    );

    const members = await listClientMembers(auth.supabase, id);
    return NextResponse.json({ members });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load members.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
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

    requireClientPermission(access.role, "client.members", {
      orgRole: access.orgRole,
    });

    const body = (await request.json()) as { email?: string; role?: ClientRole };
    if (!body.email?.trim()) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const role = body.role ?? "editor";
    const invitation = await createClientInvitation(auth.supabase, {
      clientWorkspaceId: id,
      organizationId: auth.organizationId,
      invitedBy: auth.user.id,
      email: body.email.trim(),
      role,
    });

    return NextResponse.json(
      {
        ok: true,
        inviteUrl: invitation.inviteUrl,
        expiresAt: invitation.expiresAt,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send invitation.";
    return NextResponse.json({ error: message }, { status: 400 });
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
      memberId?: string;
      role?: ClientRole;
    };

    if (!body.memberId || !body.role) {
      return NextResponse.json(
        { error: "Member ID and role are required." },
        { status: 400 }
      );
    }

    await updateClientMemberRole(auth.supabase, {
      clientWorkspaceId: id,
      memberId: body.memberId,
      role: body.role,
      actorRole: access.role,
      orgRole: access.orgRole,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update member.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");

  if (!memberId) {
    return NextResponse.json({ error: "Member ID is required." }, { status: 400 });
  }

  try {
    const access = await verifyClientWorkspaceAccess(
      auth.supabase,
      auth.organizationId,
      auth.user.id,
      id
    );

    await removeClientMember(auth.supabase, {
      clientWorkspaceId: id,
      memberId,
      actorRole: access.role,
      orgRole: access.orgRole,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to remove member.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
