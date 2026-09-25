import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import type { ScopedAuthResult } from "@/lib/workspaces/api-auth";
import { ReportingError } from "./errors";
import { reportingContextFromAuth } from "./service";
import type { ReportingContext } from "./types";

export type ReportAuth = Extract<ScopedAuthResult, { organizationId: string }> & {
  ctx: ReportingContext;
};

export async function requireReportAuth(): Promise<ReportAuth | NextResponse> {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  try {
    return {
      ...auth,
      ctx: reportingContextFromAuth(auth),
    };
  } catch (error) {
    if (error instanceof ReportingError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }
}

export function handleReportingError(error: unknown) {
  if (error instanceof ReportingError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }
  const message = error instanceof Error ? error.message : "Request failed.";
  return NextResponse.json({ error: message }, { status: 500 });
}
