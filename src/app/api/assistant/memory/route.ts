import { NextResponse } from "next/server";
import { requireBrandView } from "@/lib/assistant/brand-brain/api-auth";
import { listAllMemories } from "@/lib/assistant/brand-brain/service";
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
    const { ctx } = requireBrandView(auth);
    const memories = await listAllMemories(ctx);
    return NextResponse.json({ memories });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load memories.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
