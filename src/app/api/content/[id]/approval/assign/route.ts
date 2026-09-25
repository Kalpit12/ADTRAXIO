import { NextResponse } from "next/server";
import { assignContentReviewer } from "@/lib/collaboration/content-approvals";
import {
  handleCollaborationError,
  requireCollaborationAuth,
} from "@/lib/collaboration/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireCollaborationAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;

  try {
    const body = (await request.json()) as { assigneeId?: string | null };
    const approval = await assignContentReviewer(
      auth.supabase,
      id,
      auth.ctx,
      auth.scope,
      auth.workspace.isAgency,
      body.assigneeId ?? null
    );
    return NextResponse.json({ approval });
  } catch (error) {
    return handleCollaborationError(error);
  }
}
