import { NextResponse } from "next/server";
import {
  getLatestContentApproval,
  requestContentApproval,
  resubmitContentApproval,
} from "@/lib/collaboration/content-approvals";
import {
  handleCollaborationError,
  requireCollaborationAuth,
} from "@/lib/collaboration/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireCollaborationAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const approval = await getLatestContentApproval(
      auth.supabase,
      id,
      auth.organizationId
    );
    return NextResponse.json({ approval });
  } catch (error) {
    return handleCollaborationError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireCollaborationAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const body = (await request.json()) as { assignedTo?: string | null };
    const latest = await getLatestContentApproval(
      auth.supabase,
      id,
      auth.organizationId
    );

    const approval =
      latest?.status === "changes_requested"
        ? await resubmitContentApproval(
            auth.supabase,
            id,
            auth.ctx,
            auth.scope,
            auth.workspace.isAgency,
            body.assignedTo
          )
        : await requestContentApproval(auth.supabase, {
            contentId: id,
            ctx: auth.ctx,
            scope: auth.scope,
            isAgency: auth.workspace.isAgency,
            assignedTo: body.assignedTo,
          });

    return NextResponse.json({ approval }, { status: 201 });
  } catch (error) {
    return handleCollaborationError(error);
  }
}
