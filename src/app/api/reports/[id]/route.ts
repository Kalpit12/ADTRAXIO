import { NextResponse } from "next/server";
import {
  deleteReport,
  getReport,
  updateReport,
} from "@/lib/reporting/service";
import {
  handleReportingError,
  requireReportAuth,
} from "@/lib/reporting/route-helpers";
import type { UpdateReportInput } from "@/lib/reporting/types";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireReportAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const report = await getReport(auth.supabase, id, auth.ctx);
    return NextResponse.json({ report });
  } catch (error) {
    return handleReportingError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireReportAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const body = (await request.json()) as UpdateReportInput;
    const report = await updateReport(auth.supabase, id, auth.ctx, body);
    return NextResponse.json({ report });
  } catch (error) {
    return handleReportingError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireReportAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    await deleteReport(auth.supabase, id, auth.ctx);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleReportingError(error);
  }
}
