import { NextResponse } from "next/server";
import {
  getUnreadNotificationCount,
  listNotifications,
} from "@/lib/collaboration/notifications";
import { requireAuthContext } from "@/lib/social/auth-context";

export async function GET(request: Request) {
  const auth = await requireAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  try {
    const workspaceFilter = {
      isAgency: auth.workspace.isAgency,
      clientWorkspaceId: auth.workspace.clientWorkspaceId,
    };

    const [notifications, unreadCount] = await Promise.all([
      listNotifications(auth.supabase, auth.user.id, {
        limit: Number(searchParams.get("limit") ?? 30),
        unreadOnly,
        ...workspaceFilter,
      }),
      getUnreadNotificationCount(auth.supabase, auth.user.id, workspaceFilter),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load notifications.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
