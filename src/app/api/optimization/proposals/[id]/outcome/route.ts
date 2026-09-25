import { NextResponse } from "next/server";
import { isValidUuid } from "@/lib/assistant/resource-scope";
import { getOptimizationOutcome } from "@/lib/optimization/outcome";
import { requireOptimizationView } from "@/lib/optimization/api-auth";
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
  const { ctx } = requireOptimizationView(auth);
  const outcome = await getOptimizationOutcome(ctx, id);
  if (!outcome) {
    return NextResponse.json({ error: "No outcome record." }, { status: 404 });
  }
  return NextResponse.json({ outcome });
}
