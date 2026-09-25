import { NextResponse } from "next/server";
import {
  AssistantAIError,
  EntitlementError,
  handleChat,
} from "@/lib/assistant/service";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

export async function POST(request: Request) {
  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = body as {
    conversationId?: string;
    message?: string;
    attachments?: Array<{
      id: string;
      name: string;
      mimeType: string;
      size: number;
      type: "image" | "file";
      url: string;
      path?: string;
      extractedText?: string | null;
    }>;
  };

  const message = parsed.message?.trim() ?? "";
  const attachments = Array.isArray(parsed.attachments) ? parsed.attachments : [];

  if (!message && attachments.length === 0) {
    return NextResponse.json(
      { error: "Message or attachment is required." },
      { status: 400 }
    );
  }

  try {
    const result = await handleChat(
      { ...auth, workspace: auth.workspace },
      {
        conversationId: parsed.conversationId,
        message,
        attachments,
      }
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof EntitlementError) {
      return NextResponse.json(
        { error: error.message, code: "PLAN_LIMIT" },
        { status: error.status }
      );
    }
    if (error instanceof AssistantAIError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    const message =
      error instanceof Error ? error.message : "Unable to process message.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
