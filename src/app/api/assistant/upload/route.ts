import { NextResponse } from "next/server";
import {
  AssistantAttachmentError,
  ASSISTANT_MAX_ATTACHMENTS,
  uploadAssistantAttachment,
} from "@/lib/assistant/attachments";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

export async function POST(request: Request) {
  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const attachment = await uploadAssistantAttachment(
      auth.supabase,
      auth.organizationId,
      file
    );

    return NextResponse.json({ attachment });
  } catch (error) {
    if (error instanceof AssistantAttachmentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Unable to upload file.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    maxAttachments: ASSISTANT_MAX_ATTACHMENTS,
    maxImageBytes: 8 * 1024 * 1024,
    maxTextBytes: 512 * 1024,
    allowedTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/json",
    ],
  });
}
