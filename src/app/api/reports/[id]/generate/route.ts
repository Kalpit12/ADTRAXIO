import { NextResponse } from "next/server";
import { generateReportSnapshot } from "@/lib/reporting/service";
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
    const snapshot = await generateReportSnapshot(
      auth.supabase,
      id,
      auth.ctx,
      auth.scope
    );
    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (error) {
    return handleReportingError(error);
  }
}
