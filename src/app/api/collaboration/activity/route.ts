import { NextResponse } from "next/server";
import { listActivity } from "@/lib/collaboration/activity";
import { requireCollaborationPermission } from "@/lib/collaboration/permissions";
import { permissionOptions } from "@/lib/collaboration/service";
import {
  handleCollaborationError,
  requireCollaborationAuth,
} from "@/lib/collaboration/route-helpers";

export async function GET(request: Request) {
  const auth = await requireCollaborationAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    requireCollaborationPermission(
      "activity.view",
      permissionOptions(auth.ctx, auth.workspace.isAgency)
    );

    const { searchParams } = new URL(request.url);
    const activity = await listActivity(auth.supabase, {
      organizationId: auth.organizationId,
      clientWorkspaceId: auth.workspace.clientWorkspaceId,
      entityType: searchParams.get("entityType") ?? undefined,
      entityId: searchParams.get("entityId") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 50),
    });

    return NextResponse.json({ activity });
  } catch (error) {
    return handleCollaborationError(error);
  }
}
