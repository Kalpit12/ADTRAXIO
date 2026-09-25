import { NextResponse } from "next/server";
import { createReport, listReports } from "@/lib/reporting/service";
import {
  handleReportingError,
  requireReportAuth,
} from "@/lib/reporting/route-helpers";
import type { CreateReportInput } from "@/lib/reporting/types";

export async function GET() {
  const auth = await requireReportAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const reports = await listReports(auth.supabase, auth.ctx);
    return NextResponse.json({ reports });
  } catch (error) {
    return handleReportingError(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireReportAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as CreateReportInput;
    const report = await createReport(auth.supabase, auth.ctx, body);
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    return handleReportingError(error);
  }
}
