import { NextResponse } from "next/server";
import { approveCampaignApproval } from "@/lib/collaboration/campaign-approvals";
import {
  handleCollaborationError,
  requireCollaborationAuth,
} from "@/lib/collaboration/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireCollaborationAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;

  try {
    const approval = await approveCampaignApproval(
      auth.supabase,
      id,
      auth.ctx,
      auth.scope,
      auth.workspace.isAgency
    );
    return NextResponse.json({ approval });
  } catch (error) {
    return handleCollaborationError(error);
  }
}
