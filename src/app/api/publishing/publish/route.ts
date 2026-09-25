import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import { toClientError } from "@/lib/publishing/errors";
import { publishNow } from "@/lib/publishing/service";
import type { CreatePublishRequest } from "@/lib/publishing/types";

export async function POST(request: Request) {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  let body: CreatePublishRequest;
  try {
    body = (await request.json()) as CreatePublishRequest;
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

  try {
    const post = await publishNow(auth.supabase, {
      organizationId: auth.organizationId,
      userId: auth.user.id,
      request: body,
      scope: auth.scope,
    });

    return NextResponse.json({ post });
  } catch (error) {
    const clientError = toClientError(error);
    return NextResponse.json(
      { error: clientError.message, code: clientError.code },
      { status: clientError.status }
    );
  }
}
