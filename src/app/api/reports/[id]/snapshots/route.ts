import { NextResponse } from "next/server";
import { listReportSnapshots } from "@/lib/reporting/service";
import {
  handleReportingError,
  requireReportAuth,
} from "@/lib/reporting/route-helpers";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireReportAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const snapshots = await listReportSnapshots(auth.supabase, id, auth.ctx);
    return NextResponse.json({ snapshots });
  } catch (error) {
    return handleReportingError(error);
  }
}
