import { NextResponse } from "next/server";
import { requestContentChanges } from "@/lib/collaboration/content-approvals";
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
    const body = (await request.json()) as { reason?: string };
    const approval = await requestContentChanges(
      auth.supabase,
      id,
      auth.ctx,
      auth.scope,
      auth.workspace.isAgency,
      body.reason
    );
    return NextResponse.json({ approval });
  } catch (error) {
    return handleCollaborationError(error);
  }
}
