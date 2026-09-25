import { NextResponse } from "next/server";
import {
  assistantContextFromAuth,
  deleteConversation,
  getConversation,
} from "@/lib/assistant/service";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  const { id } = await context.params;

  try {
    const ctx = assistantContextFromAuth(auth);
    const result = await getConversation(ctx, id);
    if (!result) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load conversation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  const { id } = await context.params;

  try {
    const ctx = assistantContextFromAuth(auth);
    await deleteConversation(ctx, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete conversation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
