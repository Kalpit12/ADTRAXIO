import { NextResponse } from "next/server";
import { checkLimit } from "@/lib/billing/entitlements";
import { EntitlementError } from "@/lib/billing/errors";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import { toClientError } from "@/lib/publishing/errors";
import { schedulePost } from "@/lib/publishing/service";
import { localDateTimeToUtcIso } from "@/lib/publishing/timezone";
import type { SchedulePublishRequest } from "@/lib/publishing/types";

export async function POST(request: Request) {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  let body: SchedulePublishRequest & {
    scheduleDate?: string;
    scheduleTime?: string;
  };

  try {
    body = (await request.json()) as SchedulePublishRequest & {
      scheduleDate?: string;
      scheduleTime?: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.socialAccountId) {
    return NextResponse.json(
      { error: "Social account is required." },
      { status: 400 }
    );
  }

  if (!body.contentId && !body.caption?.trim()) {
    return NextResponse.json(
      { error: "Caption or saved content is required." },
      { status: 400 }
    );
  }

  let scheduledFor = body.scheduledFor;
  if (body.scheduleDate && body.scheduleTime && body.timezone) {
    scheduledFor = localDateTimeToUtcIso({
      date: body.scheduleDate,
      time: body.scheduleTime,
      timezone: body.timezone,
    });
  }

  if (!scheduledFor || !body.timezone) {
    return NextResponse.json(
      { error: "Schedule date, time, and timezone are required." },
      { status: 400 }
    );
  }

  try {
    const monthStart = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
    ).toISOString();

    const { count } = await auth.supabase
      .from("scheduled_posts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", auth.organizationId)
      .eq("status", "scheduled")
      .gte("created_at", monthStart);

    await checkLimit(
      auth.supabase,
      auth.organizationId,
      "scheduled_posts",
      count ?? 0
    );

    const post = await schedulePost(auth.supabase, {
      organizationId: auth.organizationId,
      userId: auth.user.id,
      request: {
        ...body,
        scheduledFor,
        timezone: body.timezone,
      },
      scope: auth.scope,
    });

    return NextResponse.json({ post });
  } catch (error) {
    if (error instanceof EntitlementError) {
      return NextResponse.json(
        { error: error.message, code: "PLAN_LIMIT" },
        { status: error.status }
      );
    }
    const clientError = toClientError(error);
    return NextResponse.json(
      { error: clientError.message, code: clientError.code },
      { status: clientError.status }
    );
  }
}
