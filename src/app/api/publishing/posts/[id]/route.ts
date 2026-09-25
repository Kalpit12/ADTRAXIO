import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import { toClientError } from "@/lib/publishing/errors";
import { getPublishingPost } from "@/lib/publishing/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  const { id } = await context.params;

  try {
    const post = await getPublishingPost(auth.supabase, auth.organizationId, id);
    if (!post) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }
    return NextResponse.json({ post });
  } catch (error) {
    const clientError = toClientError(error);
    return NextResponse.json(
      { error: clientError.message, code: clientError.code },
      { status: clientError.status }
    );
  }
}
