import { NextResponse } from "next/server";
import { isValidUuid } from "@/lib/assistant/resource-scope";
import { requireOptimizationApprove } from "@/lib/optimization/api-auth";
import { approveOptimizationProposal } from "@/lib/optimization/service";
import { OptimizationValidationError } from "@/lib/optimization/validation";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

export async function POST(
  request: Request,
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
  let confirmHighRisk = false;
  try {
    const body = (await request.json()) as { confirmHighRisk?: boolean };
    confirmHighRisk = Boolean(body.confirmHighRisk);
  } catch {
    /* empty body ok */
  }
  try {
    const { ctx } = requireOptimizationApprove(auth);
    const proposal = await approveOptimizationProposal(ctx, id, { confirmHighRisk });
    return NextResponse.json({ proposal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to approve.";
    if (error instanceof OptimizationValidationError) {
      const status = message.includes("permission") ? 403 : 400;
      return NextResponse.json({ error: message }, { status });
    }
    if (message.includes("permission")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
