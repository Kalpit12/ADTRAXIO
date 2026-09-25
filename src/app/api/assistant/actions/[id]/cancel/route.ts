import { NextResponse } from "next/server";
import { handleCancelAction } from "@/lib/assistant/service";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  const { id } = await context.params;

  try {
    await handleCancelAction(auth, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to cancel action.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
