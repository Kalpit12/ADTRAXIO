import { NextResponse } from "next/server";
import { publishReport } from "@/lib/reporting/service";
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
    const result = await publishReport(
      auth.supabase,
      id,
      auth.ctx,
      auth.scope
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleReportingError(error);
  }
}
