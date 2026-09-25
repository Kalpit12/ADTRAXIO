import type { SupabaseClient } from "@supabase/supabase-js";
import { parseDateRange } from "@/lib/analytics/date-range";
import { AnalyticsError } from "@/lib/analytics/errors";
import type { WorkspaceScope } from "@/lib/workspaces/scope";
import { verifyResourceClientScope } from "@/lib/workspaces/query-scope";
import {
  REPORT_PLATFORMS,
  REPORT_STATUSES,
  REPORT_VISIBILITIES,
} from "./constants";
import { ReportingError } from "./errors";
import { buildReportSnapshotData } from "./metrics";
import {
  canAccessReport,
  filterReportsForViewer,
  requireReportPermission,
} from "./permissions";
import {
  deleteReportRow,
  fetchLatestSnapshot,
  fetchReportById,
  fetchReportsForWorkspace,
  fetchSnapshotById,
  fetchSnapshotsForReport,
  insertReport,
  insertReportView,
  insertSnapshot,
  updateReportRow,
  updateReportStatus,
} from "./queries";
import { finalizeSnapshotData } from "./snapshot";
import type {
  CreateReportInput,
  ReportListItem,
  ReportRecord,
  ReportSnapshotRecord,
  ReportingContext,
  UpdateReportInput,
} from "./types";

function permissionOptions(ctx: ReportingContext) {
  return {
    clientRole: ctx.clientRole,
    orgRole: ctx.orgRole,
    isAgency: ctx.isAgency,
  };
}

function validateDateRange(dateFrom: string, dateTo: string): void {
  try {
    parseDateRange({ from: dateFrom, to: dateTo, preset: "custom" });
  } catch (error) {
    if (error instanceof AnalyticsError) {
      throw new ReportingError("invalid_date_range", error.message, 400);
    }
    throw error;
  }

  const today = new Date().toISOString().slice(0, 10);
  if (dateFrom > today && dateTo > today) {
    throw new ReportingError(
      "invalid_date_range",
      "Date range cannot be entirely in the future.",
      400
    );
  }
}

function validatePlatforms(platforms: string[] | undefined): string[] {
  if (!platforms || platforms.length === 0) return [];
  const valid = platforms.filter((p) =>
    (REPORT_PLATFORMS as readonly string[]).includes(p)
  );
  return [...new Set(valid)];
}

export function reportingContextFromAuth(auth: {
  organizationId: string;
  user: { id: string };
  workspace: {
    isAgency: boolean;
    clientWorkspaceId: string | null;
    clientWorkspace: { name: string } | null;
    clientRole: ReportingContext["clientRole"];
    orgRole: string | null;
  };
}): ReportingContext {
  if (!auth.workspace.clientWorkspaceId) {
    throw new ReportingError(
      "workspace_required",
      "Select a client workspace to manage reports.",
      403
    );
  }

  return {
    organizationId: auth.organizationId,
    userId: auth.user.id,
    clientWorkspaceId: auth.workspace.clientWorkspaceId,
    clientWorkspaceName: auth.workspace.clientWorkspace?.name ?? "Client",
    isAgency: auth.workspace.isAgency,
    clientRole: auth.workspace.clientRole,
    orgRole: auth.workspace.orgRole,
  };
}

async function assertReportInWorkspace(
  supabase: SupabaseClient,
  report: ReportRecord,
  ctx: ReportingContext
): Promise<void> {
  if (report.clientWorkspaceId !== ctx.clientWorkspaceId) {
    throw new ReportingError("not_found", "Report not found.", 404);
  }

  await verifyResourceClientScope(
    supabase,
    "reports",
    report.id,
    ctx.organizationId,
    ctx.clientWorkspaceId,
    ctx.isAgency
  );
}

export async function listReports(
  supabase: SupabaseClient,
  ctx: ReportingContext
): Promise<ReportListItem[]> {
  requireReportPermission("report_view", permissionOptions(ctx));

  const reports = await fetchReportsForWorkspace(
    supabase,
    ctx.organizationId,
    ctx.clientWorkspaceId
  );

  return filterReportsForViewer(reports, permissionOptions(ctx));
}

export async function getReport(
  supabase: SupabaseClient,
  reportId: string,
  ctx: ReportingContext
): Promise<ReportRecord> {
  const report = await fetchReportById(supabase, reportId, ctx.organizationId);
  if (!report) {
    throw new ReportingError("not_found", "Report not found.", 404);
  }

  await assertReportInWorkspace(supabase, report, ctx);

  if (!canAccessReport(report, permissionOptions(ctx))) {
    throw new ReportingError("forbidden", "You cannot access this report.", 403);
  }

  return report;
}

export async function createReport(
  supabase: SupabaseClient,
  ctx: ReportingContext,
  input: CreateReportInput
): Promise<ReportRecord> {
  requireReportPermission("report_create", permissionOptions(ctx));

  if (!input.name?.trim()) {
    throw new ReportingError("invalid_input", "Report name is required.", 400);
  }

  validateDateRange(input.dateFrom, input.dateTo);

  const visibility = input.visibility ?? "internal";
  if (!REPORT_VISIBILITIES.includes(visibility)) {
    throw new ReportingError("invalid_input", "Invalid visibility.", 400);
  }

  return insertReport(supabase, {
    organizationId: ctx.organizationId,
    clientWorkspaceId: ctx.clientWorkspaceId,
    createdBy: ctx.userId,
    payload: {
      ...input,
      platforms: validatePlatforms(input.platforms),
    },
  });
}

export async function updateReport(
  supabase: SupabaseClient,
  reportId: string,
  ctx: ReportingContext,
  input: UpdateReportInput
): Promise<ReportRecord> {
  requireReportPermission("report_edit", permissionOptions(ctx));

  const existing = await getReport(supabase, reportId, ctx);
  if (existing.status === "archived") {
    throw new ReportingError("already_archived", "Archived reports cannot be edited.", 400);
  }

  const dateFrom = input.dateFrom ?? existing.dateFrom;
  const dateTo = input.dateTo ?? existing.dateTo;
  validateDateRange(dateFrom, dateTo);

  if (input.visibility && !REPORT_VISIBILITIES.includes(input.visibility)) {
    throw new ReportingError("invalid_input", "Invalid visibility.", 400);
  }

  return updateReportRow(supabase, reportId, ctx.organizationId, {
    ...input,
    platforms: input.platforms ? validatePlatforms(input.platforms) : undefined,
  });
}

export async function deleteReport(
  supabase: SupabaseClient,
  reportId: string,
  ctx: ReportingContext
): Promise<void> {
  requireReportPermission("report_edit", permissionOptions(ctx));
  await getReport(supabase, reportId, ctx);
  await deleteReportRow(supabase, reportId, ctx.organizationId);
}

export async function generateReportSnapshot(
  supabase: SupabaseClient,
  reportId: string,
  ctx: ReportingContext,
  scope: WorkspaceScope
): Promise<ReportSnapshotRecord> {
  requireReportPermission("report_edit", permissionOptions(ctx));

  const report = await getReport(supabase, reportId, ctx);
  if (report.status === "archived") {
    throw new ReportingError("already_archived", "Cannot generate archived reports.", 400);
  }

  const base = await buildReportSnapshotData(supabase, report, ctx, scope);
  const data = await finalizeSnapshotData(base);

  return insertSnapshot(supabase, {
    reportId: report.id,
    organizationId: ctx.organizationId,
    clientWorkspaceId: ctx.clientWorkspaceId,
    generatedBy: ctx.userId,
    data,
  });
}

export async function publishReport(
  supabase: SupabaseClient,
  reportId: string,
  ctx: ReportingContext,
  scope: WorkspaceScope
): Promise<{ report: ReportRecord; snapshot: ReportSnapshotRecord }> {
  requireReportPermission("report_publish", permissionOptions(ctx));

  const report = await getReport(supabase, reportId, ctx);
  if (report.status === "archived") {
    throw new ReportingError("already_archived", "Cannot publish archived reports.", 400);
  }

  let snapshot = await fetchLatestSnapshot(supabase, reportId, ctx.organizationId);
  if (!snapshot) {
    snapshot = await generateReportSnapshot(supabase, reportId, ctx, scope);
  }

  const updated = await updateReportStatus(
    supabase,
    reportId,
    ctx.organizationId,
    "published"
  );

  return { report: updated, snapshot };
}

export async function archiveReport(
  supabase: SupabaseClient,
  reportId: string,
  ctx: ReportingContext
): Promise<ReportRecord> {
  requireReportPermission("report_archive", permissionOptions(ctx));
  await getReport(supabase, reportId, ctx);
  return updateReportStatus(supabase, reportId, ctx.organizationId, "archived");
}

export async function listReportSnapshots(
  supabase: SupabaseClient,
  reportId: string,
  ctx: ReportingContext
): Promise<ReportSnapshotRecord[]> {
  await getReport(supabase, reportId, ctx);
  requireReportPermission("report_view", permissionOptions(ctx));
  return fetchSnapshotsForReport(supabase, reportId, ctx.organizationId);
}

export async function getReportSnapshot(
  supabase: SupabaseClient,
  reportId: string,
  snapshotId: string,
  ctx: ReportingContext
): Promise<ReportSnapshotRecord> {
  await getReport(supabase, reportId, ctx);

  const snapshot = await fetchSnapshotById(
    supabase,
    snapshotId,
    reportId,
    ctx.organizationId
  );

  if (!snapshot) {
    throw new ReportingError("not_found", "Snapshot not found.", 404);
  }

  return snapshot;
}

export async function recordReportView(
  supabase: SupabaseClient,
  reportId: string,
  ctx: ReportingContext
): Promise<void> {
  const report = await getReport(supabase, reportId, ctx);

  if (report.status !== "published") {
    throw new ReportingError("forbidden", "Only published reports can be viewed.", 403);
  }

  await insertReportView(supabase, {
    reportId,
    viewerId: ctx.userId,
    clientWorkspaceId: ctx.clientWorkspaceId,
  });
}

export async function getDashboardReports(
  supabase: SupabaseClient,
  ctx: ReportingContext,
  limit = 5
): Promise<ReportListItem[]> {
  const reports = await listReports(supabase, ctx);
  return reports
    .filter((r) => r.status !== "archived")
    .slice(0, limit);
}

export function isValidReportStatus(value: string): value is ReportRecord["status"] {
  return REPORT_STATUSES.includes(value as ReportRecord["status"]);
}
