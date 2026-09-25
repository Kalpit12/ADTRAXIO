import {
  fetchLatestSnapshot,
  fetchReportById,
  fetchSnapshotById,
} from "@/lib/reporting/queries";
import { ensureOperationalScope } from "../permissions";
import { assertReportScope, isValidUuid } from "../resource-scope";
import type { AssistantContext } from "../types";

async function loadReportForAssistant(
  ctx: AssistantContext,
  reportId: string
) {
  if (!isValidUuid(reportId)) return { error: "Invalid reportId." };
  if (!ctx.clientWorkspaceId) {
    return { error: "Client workspace required for reports." };
  }

  const report = await fetchReportById(
    ctx.supabase,
    reportId,
    ctx.organizationId
  );
  if (!report) return { error: "Report not found." };
  if (!assertReportScope(ctx, report)) return { error: "Report not found." };

  return { report };
}

export async function getReportContextTool(
  ctx: AssistantContext,
  args: { reportId: string }
) {
  ensureOperationalScope(ctx.scope);
  const loaded = await loadReportForAssistant(ctx, args.reportId?.trim() ?? "");
  if ("error" in loaded) return loaded;

  const { report } = loaded;
  const snapshot = await fetchLatestSnapshot(
    ctx.supabase,
    report.id,
    ctx.organizationId
  );

  const { data: client } = await ctx.supabase
    .from("client_workspaces")
    .select("name")
    .eq("id", report.clientWorkspaceId)
    .maybeSingle();

  const data = snapshot?.data ?? null;

  return {
    report: {
      id: report.id,
      name: report.name,
      description: report.description,
      status: report.status,
      visibility: report.visibility,
      dateFrom: report.dateFrom,
      dateTo: report.dateTo,
      platforms: report.platforms,
      includeCampaigns: report.includeCampaigns,
      includeContent: report.includeContent,
      includePlatforms: report.includePlatforms,
      includeAiSummary: report.includeAiSummary,
      clientWorkspaceId: report.clientWorkspaceId,
      clientWorkspaceName: client?.name ?? null,
    },
    reportingPeriod: { from: report.dateFrom, to: report.dateTo },
    latestSnapshot: snapshot
      ? { id: snapshot.id, generatedAt: snapshot.generatedAt }
      : null,
    snapshotAvailable: Boolean(data),
    overview: data?.overview ?? null,
    growth: data?.growth ?? [],
    platforms: data?.platforms ?? [],
    topContent: data?.content?.slice(0, 10) ?? [],
    campaigns: data?.campaigns ?? [],
    recommendations: data?.recommendations ?? [],
    publishedContentCount: data?.overview?.publishedContent ?? null,
    executiveSummary: data?.aiSummary ?? null,
    messageIfNoSnapshot:
      data
        ? null
        : "No generated snapshot for this report yet. Ask the user to generate a report snapshot in Reports before analyzing metrics.",
  };
}

export async function getReportSnapshotTool(
  ctx: AssistantContext,
  args: { reportId: string; snapshotId?: string }
) {
  ensureOperationalScope(ctx.scope);
  const loaded = await loadReportForAssistant(ctx, args.reportId?.trim() ?? "");
  if ("error" in loaded) return loaded;

  const { report } = loaded;

  let snapshot = null;
  if (args.snapshotId?.trim()) {
    if (!isValidUuid(args.snapshotId)) {
      return { error: "Invalid snapshotId." };
    }
    snapshot = await fetchSnapshotById(
      ctx.supabase,
      args.snapshotId,
      report.id,
      ctx.organizationId
    );
    if (snapshot && snapshot.clientWorkspaceId !== report.clientWorkspaceId) {
      return { error: "Snapshot not found." };
    }
  } else {
    snapshot = await fetchLatestSnapshot(
      ctx.supabase,
      report.id,
      ctx.organizationId
    );
  }

  if (!snapshot) {
    return { error: "No snapshot found for this report." };
  }

  return {
    reportId: report.id,
    snapshotId: snapshot.id,
    generatedAt: snapshot.generatedAt,
    data: snapshot.data,
  };
}
