import { NextResponse } from "next/server";
import { assistantContextFromAuth } from "@/lib/assistant/context";
import { getAssistantHomeInsights } from "@/lib/assistant/home-insights";
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
    const ctx = assistantContextFromAuth({
      ...auth,
      workspace: auth.workspace,
    });
    const home = await getAssistantHomeInsights(ctx);
    return NextResponse.json({ home });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load assistant home.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
