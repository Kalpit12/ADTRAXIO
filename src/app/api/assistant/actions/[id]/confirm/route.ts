import { NextResponse } from "next/server";
import { handleConfirmAction } from "@/lib/assistant/service";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  const { id } = await context.params;

  try {
    const result = await handleConfirmAction(auth, id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, result: result.result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to confirm action.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
