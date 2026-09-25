import { NextResponse } from "next/server";
import { isValidUuid } from "@/lib/assistant/resource-scope";
import { requireExperimentView } from "@/lib/experiments/api-auth";
import { getExperimentIntelligence } from "@/lib/experiments/intelligence";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }
  try {
    const { ctx } = requireExperimentView(auth);
    const intelligence = await getExperimentIntelligence(ctx, id);
    if (!intelligence) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ intelligence });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load intelligence.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
