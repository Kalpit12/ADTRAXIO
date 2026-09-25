import { NextResponse } from "next/server";
import { deleteComment, updateComment } from "@/lib/collaboration/comments";
import {
  handleCollaborationError,
  requireCollaborationAuth,
} from "@/lib/collaboration/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireCollaborationAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;

  try {
    const body = (await request.json()) as { body?: string };
    const comment = await updateComment(
      auth.supabase,
      id,
      auth.ctx,
      auth.workspace.isAgency,
      body.body ?? ""
    );
    return NextResponse.json({ comment });
  } catch (error) {
    return handleCollaborationError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireCollaborationAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;

  try {
    await deleteComment(auth.supabase, id, auth.ctx, auth.workspace.isAgency);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleCollaborationError(error);
  }
}
