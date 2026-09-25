import { NextResponse } from "next/server";
import { getReportSnapshot } from "@/lib/reporting/service";
import {
  handleReportingError,
  requireReportAuth,
} from "@/lib/reporting/route-helpers";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; snapshotId: string }> }
) {
  const auth = await requireReportAuth();
  if (auth instanceof NextResponse) return auth;

  const { id, snapshotId } = await context.params;

  try {
    const snapshot = await getReportSnapshot(
      auth.supabase,
      id,
      snapshotId,
      auth.ctx
    );
    return NextResponse.json({ snapshot });
  } catch (error) {
    return handleReportingError(error);
  }
}
