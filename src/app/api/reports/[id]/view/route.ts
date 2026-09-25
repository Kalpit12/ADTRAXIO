import { NextResponse } from "next/server";
import { recordReportView } from "@/lib/reporting/service";
import {
  handleReportingError,
  requireReportAuth,
} from "@/lib/reporting/route-helpers";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireReportAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    await recordReportView(auth.supabase, id, auth.ctx);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleReportingError(error);
  }
}
