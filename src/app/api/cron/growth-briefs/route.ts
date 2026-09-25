import { NextResponse } from "next/server";
import { runGrowthBriefCron } from "@/lib/agent/cron";
import type { GrowthBriefType } from "@/lib/agent/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json({ error: "Cron is not configured." }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type");
  const briefType: GrowthBriefType =
    typeParam === "daily" ? "daily" : "weekly";

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Service role is not configured." },
      { status: 503 }
    );
  }

  try {
    const result = await runGrowthBriefCron(supabase, briefType);
    return NextResponse.json({ ok: true, briefType, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Growth brief cron failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
