import { NextResponse } from "next/server";
import { markNotificationRead } from "@/lib/collaboration/notifications";
import { requireAuthContext } from "@/lib/social/auth-context";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  try {
    await markNotificationRead(auth.supabase, auth.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to mark notification read.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
