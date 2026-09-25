import type { AssistantContext } from "@/lib/assistant/types";

export async function findLatestExecutedOptimizationForExperiment(
  ctx: AssistantContext,
  experimentId: string
): Promise<{ optimizationProposalId: string; optimizationExecutionId: string } | null> {
  const workspaceId = ctx.scope.isAgency
    ? ctx.scope.clientWorkspaceId ?? "00000000-0000-0000-0000-000000000000"
    : null;

  let query = ctx.supabase
    .from("ai_optimization_proposals")
    .select("id, execution_id, status")
    .eq("organization_id", ctx.organizationId)
    .eq("source_type", "experiment")
    .eq("source_id", experimentId)
    .eq("status", "executed")
    .order("executed_at", { ascending: false })
    .limit(1);

  query =
    workspaceId === null
      ? query.is("client_workspace_id", null)
      : query.eq("client_workspace_id", workspaceId);

  const { data } = await query.maybeSingle();

  if (!data?.execution_id) return null;
  return {
    optimizationProposalId: data.id as string,
    optimizationExecutionId: data.execution_id as string,
  };
}
