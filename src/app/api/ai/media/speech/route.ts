import { NextResponse } from "next/server";
import { jsonJobResponse, jsonMediaError } from "@/lib/ai/media/api";
import { isElevenLabsConfigured } from "@/lib/ai/media/config";
import {
  buildScopeFromAuth,
  startSpeechGeneration,
} from "@/lib/ai/media/service";
import { parseSpeechGenerationBody } from "@/lib/ai/media/validation";
import { requireAuthContext } from "@/lib/social/auth-context";

export async function GET() {
  return NextResponse.json({ configured: isElevenLabsConfigured() });
}

export async function POST(request: Request) {
  const auth = await requireAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseSpeechGenerationBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const scope = buildScopeFromAuth(
      auth.organizationId,
      auth.user.id,
      auth.workspace.clientWorkspaceId
    );
    const job = await startSpeechGeneration(auth.supabase, scope, parsed.request);
    return jsonJobResponse(job);
  } catch (error) {
    return jsonMediaError(error);
  }
}
