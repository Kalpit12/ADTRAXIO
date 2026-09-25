import { NextResponse } from "next/server";
import { archiveReport } from "@/lib/reporting/service";
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
    const report = await archiveReport(auth.supabase, id, auth.ctx);
    return NextResponse.json({ report });
  } catch (error) {
    return handleReportingError(error);
  }
}
