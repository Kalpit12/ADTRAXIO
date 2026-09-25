import { NextResponse } from "next/server";
import { addComment, listComments } from "@/lib/collaboration/comments";
import {
  handleCollaborationError,
  requireCollaborationAuth,
} from "@/lib/collaboration/route-helpers";

export async function GET(request: Request) {
  const auth = await requireCollaborationAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);

  try {
    const comments = await listComments(auth.supabase, {
      organizationId: auth.organizationId,
      contentId: searchParams.get("contentId"),
      campaignId: searchParams.get("campaignId"),
      approvalId: searchParams.get("approvalId"),
    });
    return NextResponse.json({ comments });
  } catch (error) {
    return handleCollaborationError(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireCollaborationAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as {
      body?: string;
      contentId?: string;
      campaignId?: string;
      approvalId?: string;
      notifyUserIds?: string[];
    };

    const comment = await addComment(auth.supabase, {
      ctx: auth.ctx,
      scope: auth.scope,
      isAgency: auth.workspace.isAgency,
      body: body.body ?? "",
      contentId: body.contentId ?? null,
      campaignId: body.campaignId ?? null,
      approvalId: body.approvalId ?? null,
      notifyUserIds: body.notifyUserIds,
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return handleCollaborationError(error);
  }
}
