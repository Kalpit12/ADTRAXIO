import { NextResponse } from "next/server";
import { isValidUuid } from "@/lib/assistant/resource-scope";
import { requireOptimizationEdit, requireOptimizationView } from "@/lib/optimization/api-auth";
import {
  listOptimizationProposals,
  prepareOptimizationProposal,
} from "@/lib/optimization/service";
import { OptimizationValidationError } from "@/lib/optimization/validation";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

export async function GET() {
  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }
  const { ctx } = requireOptimizationView(auth);
  const proposals = await listOptimizationProposals(ctx, 30);
  return NextResponse.json({ proposals });
}

export async function POST(request: Request) {
  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }
  const { ctx } = requireOptimizationEdit(auth);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = body as {
    sourceType?: string;
    sourceId?: string;
    proposalType?: string;
    objective?: string;
    proposedState?: Record<string, unknown>;
  };
  if (!parsed.sourceType || !parsed.sourceId || !isValidUuid(parsed.sourceId)) {
    return NextResponse.json({ error: "Invalid source." }, { status: 400 });
  }
  try {
    const proposal = await prepareOptimizationProposal(ctx, {
      sourceType: parsed.sourceType,
      sourceId: parsed.sourceId,
      proposalType: parsed.proposalType ?? "allocation_change",
      objective: parsed.objective,
      proposedState: parsed.proposedState ?? {},
    });
    return NextResponse.json({ proposal });
  } catch (error) {
    if (error instanceof OptimizationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unable to create proposal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
