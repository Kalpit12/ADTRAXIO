import { NextResponse } from "next/server";
import { jsonJobResponse, jsonMediaError } from "@/lib/ai/media/api";
import {
  buildScopeFromAuth,
  startImageGeneration,
} from "@/lib/ai/media/service";
import { parseImageGenerationBody } from "@/lib/ai/media/validation";
import { isOpenAIImageConfigured } from "@/lib/ai/media/config";
import { requireAuthContext } from "@/lib/social/auth-context";

export async function GET() {
  return NextResponse.json({ configured: isOpenAIImageConfigured() });
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

  const parsed = parseImageGenerationBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const scope = buildScopeFromAuth(
      auth.organizationId,
      auth.user.id,
      auth.workspace.clientWorkspaceId
    );
    const job = await startImageGeneration(auth.supabase, scope, parsed.request);
    return jsonJobResponse(job);
  } catch (error) {
    return jsonMediaError(error);
  }
}
