import { fetchReportById, fetchReportsForWorkspace } from "@/lib/reporting/queries";
import { ensureOperationalScope } from "../permissions";
import type { AssistantContext } from "../types";

export async function listReportsTool(ctx: AssistantContext) {
  ensureOperationalScope(ctx.scope);
  if (!ctx.clientWorkspaceId) {
    return { error: "Client workspace required for reports." };
  }
  const reports = await fetchReportsForWorkspace(
    ctx.supabase,
    ctx.organizationId,
    ctx.clientWorkspaceId
  );
  return reports.map((r) => ({
    id: r.id,
    title: r.name,
    status: r.status,
    dateFrom: r.dateFrom,
    dateTo: r.dateTo,
    updatedAt: r.updatedAt,
  }));
}

export async function getReportTool(
  ctx: AssistantContext,
  args: { reportId: string }
) {
  ensureOperationalScope(ctx.scope);
  if (!ctx.clientWorkspaceId) {
    return { error: "Client workspace required for reports." };
  }
  if (!args.reportId?.trim()) return { error: "reportId is required." };
  const report = await fetchReportById(
    ctx.supabase,
    args.reportId,
    ctx.organizationId
  );
  if (!report || report.clientWorkspaceId !== ctx.clientWorkspaceId) {
    return { error: "Report not found." };
  }
  return report;
}
