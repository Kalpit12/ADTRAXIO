import { NextResponse } from "next/server";
import { isValidUuid } from "@/lib/assistant/resource-scope";
import { requireOptimizationExecute } from "@/lib/optimization/api-auth";
import { executeOptimizationProposal } from "@/lib/optimization/executor";
import { OptimizationValidationError } from "@/lib/optimization/validation";
import { logRequestFailure } from "@/lib/observability/log";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

export async function POST(
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
    const { ctx } = requireOptimizationExecute(auth);
    const result = await executeOptimizationProposal(ctx, id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to execute.";
    if (error instanceof OptimizationValidationError) {
      logRequestFailure({
        operation: "optimization.execute",
        category: "validation",
        status: 400,
        organizationId: auth.organizationId,
        clientWorkspaceId: auth.workspace.clientWorkspaceId,
        resourceId: id,
        message,
      });
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.includes("permission")) {
      logRequestFailure({
        operation: "optimization.execute",
        category: "permission",
        status: 403,
        organizationId: auth.organizationId,
        clientWorkspaceId: auth.workspace.clientWorkspaceId,
        resourceId: id,
        message,
      });
      return NextResponse.json({ error: message }, { status: 403 });
    }
    logRequestFailure({
      operation: "optimization.execute",
      category: "server",
      status: 500,
      organizationId: auth.organizationId,
      clientWorkspaceId: auth.workspace.clientWorkspaceId,
      resourceId: id,
      message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
