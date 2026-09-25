import { NextResponse } from "next/server";
import {
  assistantContextFromAuth,
  createConversation,
  listConversations,
} from "@/lib/assistant/service";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

export async function GET() {
  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  try {
    const ctx = assistantContextFromAuth(auth);
    const conversations = await listConversations(ctx);
    return NextResponse.json({ conversations });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load conversations.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  let title: string | undefined;
  try {
    const body = (await request.json()) as { title?: string };
    title = body.title;
  } catch {
    // optional body
  }

  try {
    const ctx = assistantContextFromAuth(auth);
    const conversation = await createConversation(
      ctx,
      auth.workspace,
      title
    );
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create conversation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
