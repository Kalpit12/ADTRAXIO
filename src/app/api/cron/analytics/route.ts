import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toClientError } from "@/lib/analytics/errors";
import { logOperation, logRequestFailure } from "@/lib/observability/log";
import { syncAllAnalytics } from "@/lib/analytics/service";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json({ error: "Cron is not configured." }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Service role is not configured." },
      { status: 503 }
    );
  }

  try {
    const summary = await syncAllAnalytics(supabase);
    logOperation({
      operation: "cron.analytics",
      category: "cron",
      status: "ok",
      message: JSON.stringify(summary).slice(0, 500),
    });
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    const clientError = toClientError(error);
    logRequestFailure({
      operation: "cron.analytics",
      category: "cron",
      status: clientError.status,
      message: clientError.message,
    });
    return NextResponse.json(
      { error: clientError.message, code: clientError.code },
      { status: clientError.status }
    );
  }
}
