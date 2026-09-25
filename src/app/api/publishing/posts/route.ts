import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import { toClientError } from "@/lib/publishing/errors";
import { listPublishingPosts } from "@/lib/publishing/service";

export async function GET() {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  try {
    const posts = await listPublishingPosts(
      auth.supabase,
      auth.organizationId,
      auth.scope
    );
    return NextResponse.json({ posts });
  } catch (error) {
    const clientError = toClientError(error);
    return NextResponse.json(
      { error: clientError.message, code: clientError.code },
      { status: clientError.status }
    );
  }
}
