import { NextResponse } from "next/server";
import { markAllNotificationsRead } from "@/lib/collaboration/notifications";
import { requireAuthContext } from "@/lib/social/auth-context";

export async function POST() {
  const auth = await requireAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await markAllNotificationsRead(auth.supabase, auth.user.id, {
      isAgency: auth.workspace.isAgency,
      clientWorkspaceId: auth.workspace.clientWorkspaceId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to mark notifications read.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
