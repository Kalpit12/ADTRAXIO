import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceScope } from "@/lib/workspaces/scope";

const EMPTY_CLIENT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

function scopeWorkspaceQuery<T extends { is: (c: string, v: null) => T; eq: (c: string, v: string) => T }>(
  query: T,
  scope: WorkspaceScope
): T {
  if (!scope.isAgency) return query.is("client_workspace_id", null);
  if (scope.clientWorkspaceId) {
    return query.eq("client_workspace_id", scope.clientWorkspaceId);
  }
  return query.eq("client_workspace_id", EMPTY_CLIENT_WORKSPACE_ID);
}
import { ReportingError } from "./errors";
import type {
  CreateReportInput,
  ReportListItem,
  ReportRecord,
  ReportSnapshotRecord,
  ReportSnapshotData,
  UpdateReportInput,
} from "./types";

type DbReportRow = {
  id: string;
  organization_id: string;
  client_workspace_id: string;
  created_by: string;
  name: string;
  description: string | null;
  date_from: string;
  date_to: string;
  status: string;
  visibility: string;
  platforms: unknown;
  include_campaigns: boolean;
  include_content: boolean;
  include_platforms: boolean;
  include_ai_summary: boolean;
  created_at: string;
  updated_at: string;
  client_workspaces?: { name: string } | null;
};

type DbSnapshotRow = {
  id: string;
  report_id: string;
  organization_id: string;
  client_workspace_id: string;
  generated_by: string;
  generated_at: string;
  data: unknown;
  created_at: string;
};

function mapReport(row: DbReportRow): ReportRecord {
  const platforms = Array.isArray(row.platforms)
    ? row.platforms.filter((p): p is string => typeof p === "string")
    : [];

  return {
    id: row.id,
    organizationId: row.organization_id,
    clientWorkspaceId: row.client_workspace_id,
    createdBy: row.created_by,
    name: row.name,
    description: row.description,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    status: row.status as ReportRecord["status"],
    visibility: row.visibility as ReportRecord["visibility"],
    platforms,
    includeCampaigns: row.include_campaigns,
    includeContent: row.include_content,
    includePlatforms: row.include_platforms,
    includeAiSummary: row.include_ai_summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSnapshot(row: DbSnapshotRow): ReportSnapshotRecord {
  return {
    id: row.id,
    reportId: row.report_id,
    organizationId: row.organization_id,
    clientWorkspaceId: row.client_workspace_id,
    generatedBy: row.generated_by,
    generatedAt: row.generated_at,
    data: row.data as ReportSnapshotData,
    createdAt: row.created_at,
  };
}

export async function fetchReportById(
  supabase: SupabaseClient,
  reportId: string,
  organizationId: string
): Promise<ReportRecord | null> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    throw new ReportingError("database_error", error.message, 500);
  }

  return data ? mapReport(data as DbReportRow) : null;
}

export async function fetchReportsForWorkspace(
  supabase: SupabaseClient,
  organizationId: string,
  clientWorkspaceId: string
): Promise<ReportListItem[]> {
  const { data, error } = await supabase
    .from("reports")
    .select(
      "*, client_workspaces(name), report_snapshots(id, generated_at)"
    )
    .eq("organization_id", organizationId)
    .eq("client_workspace_id", clientWorkspaceId)
    .order("updated_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") return [];
    throw new ReportingError("database_error", error.message, 500);
  }

  return (data ?? []).map((row) => {
    const report = mapReport(row as DbReportRow);
    const snapshots = (
      row as DbReportRow & {
        report_snapshots?: { id: string; generated_at: string }[];
      }
    ).report_snapshots;
    const latest = [...(snapshots ?? [])].sort((a, b) =>
      b.generated_at.localeCompare(a.generated_at)
    )[0];

    return {
      ...report,
      clientName:
        (row as DbReportRow).client_workspaces?.name ?? null,
      lastGeneratedAt: latest?.generated_at ?? null,
      latestSnapshotId: latest?.id ?? null,
    };
  });
}

export async function insertReport(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    clientWorkspaceId: string;
    createdBy: string;
    payload: CreateReportInput;
  }
): Promise<ReportRecord> {
  const { data, error } = await supabase
    .from("reports")
    .insert({
      organization_id: input.organizationId,
      client_workspace_id: input.clientWorkspaceId,
      created_by: input.createdBy,
      name: input.payload.name.trim(),
      description: input.payload.description?.trim() || null,
      date_from: input.payload.dateFrom,
      date_to: input.payload.dateTo,
      status: "draft",
      visibility: input.payload.visibility ?? "internal",
      platforms: input.payload.platforms ?? [],
      include_campaigns: input.payload.includeCampaigns ?? true,
      include_content: input.payload.includeContent ?? true,
      include_platforms: input.payload.includePlatforms ?? true,
      include_ai_summary: input.payload.includeAiSummary ?? true,
    })
    .select("*")
    .single();

  if (error) {
    throw new ReportingError("database_error", error.message, 500);
  }

  return mapReport(data as DbReportRow);
}

export async function updateReportRow(
  supabase: SupabaseClient,
  reportId: string,
  organizationId: string,
  payload: UpdateReportInput
): Promise<ReportRecord> {
  const updates: Record<string, unknown> = {};

  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.description !== undefined) {
    updates.description = payload.description?.trim() || null;
  }
  if (payload.dateFrom !== undefined) updates.date_from = payload.dateFrom;
  if (payload.dateTo !== undefined) updates.date_to = payload.dateTo;
  if (payload.visibility !== undefined) updates.visibility = payload.visibility;
  if (payload.platforms !== undefined) updates.platforms = payload.platforms;
  if (payload.includeCampaigns !== undefined) {
    updates.include_campaigns = payload.includeCampaigns;
  }
  if (payload.includeContent !== undefined) {
    updates.include_content = payload.includeContent;
  }
  if (payload.includePlatforms !== undefined) {
    updates.include_platforms = payload.includePlatforms;
  }
  if (payload.includeAiSummary !== undefined) {
    updates.include_ai_summary = payload.includeAiSummary;
  }

  const { data, error } = await supabase
    .from("reports")
    .update(updates)
    .eq("id", reportId)
    .eq("organization_id", organizationId)
    .select("*")
    .single();

  if (error) {
    throw new ReportingError("database_error", error.message, 500);
  }

  return mapReport(data as DbReportRow);
}

export async function updateReportStatus(
  supabase: SupabaseClient,
  reportId: string,
  organizationId: string,
  status: ReportRecord["status"]
): Promise<ReportRecord> {
  const { data, error } = await supabase
    .from("reports")
    .update({ status })
    .eq("id", reportId)
    .eq("organization_id", organizationId)
    .select("*")
    .single();

  if (error) {
    throw new ReportingError("database_error", error.message, 500);
  }

  return mapReport(data as DbReportRow);
}

export async function deleteReportRow(
  supabase: SupabaseClient,
  reportId: string,
  organizationId: string
): Promise<void> {
  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("id", reportId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new ReportingError("database_error", error.message, 500);
  }
}

export async function insertSnapshot(
  supabase: SupabaseClient,
  input: {
    reportId: string;
    organizationId: string;
    clientWorkspaceId: string;
    generatedBy: string;
    data: ReportSnapshotData;
  }
): Promise<ReportSnapshotRecord> {
  const { data, error } = await supabase
    .from("report_snapshots")
    .insert({
      report_id: input.reportId,
      organization_id: input.organizationId,
      client_workspace_id: input.clientWorkspaceId,
      generated_by: input.generatedBy,
      generated_at: input.data.generatedAt,
      data: input.data,
    })
    .select("*")
    .single();

  if (error) {
    throw new ReportingError("database_error", error.message, 500);
  }

  return mapSnapshot(data as DbSnapshotRow);
}

export async function fetchSnapshotsForReport(
  supabase: SupabaseClient,
  reportId: string,
  organizationId: string
): Promise<ReportSnapshotRecord[]> {
  const { data, error } = await supabase
    .from("report_snapshots")
    .select("*")
    .eq("report_id", reportId)
    .eq("organization_id", organizationId)
    .order("generated_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") return [];
    throw new ReportingError("database_error", error.message, 500);
  }

  return (data ?? []).map((row) => mapSnapshot(row as DbSnapshotRow));
}

export async function fetchSnapshotById(
  supabase: SupabaseClient,
  snapshotId: string,
  reportId: string,
  organizationId: string
): Promise<ReportSnapshotRecord | null> {
  const { data, error } = await supabase
    .from("report_snapshots")
    .select("*")
    .eq("id", snapshotId)
    .eq("report_id", reportId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    throw new ReportingError("database_error", error.message, 500);
  }

  return data ? mapSnapshot(data as DbSnapshotRow) : null;
}

export async function fetchLatestSnapshot(
  supabase: SupabaseClient,
  reportId: string,
  organizationId: string
): Promise<ReportSnapshotRecord | null> {
  const { data, error } = await supabase
    .from("report_snapshots")
    .select("*")
    .eq("report_id", reportId)
    .eq("organization_id", organizationId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    throw new ReportingError("database_error", error.message, 500);
  }

  return data ? mapSnapshot(data as DbSnapshotRow) : null;
}

export async function insertReportView(
  supabase: SupabaseClient,
  input: {
    reportId: string;
    viewerId: string;
    clientWorkspaceId: string;
  }
): Promise<void> {
  const { error } = await supabase.from("report_views").insert({
    report_id: input.reportId,
    viewer_id: input.viewerId,
    client_workspace_id: input.clientWorkspaceId,
    viewed_at: new Date().toISOString(),
  });

  if (error && error.code !== "42P01") {
    throw new ReportingError("database_error", error.message, 500);
  }
}

export async function countPublishedPostsInRange(
  supabase: SupabaseClient,
  organizationId: string,
  scope: WorkspaceScope,
  from: string,
  to: string
): Promise<number> {
  let query = supabase
    .from("scheduled_posts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "published")
    .gte("published_at", `${from}T00:00:00.000Z`)
    .lte("published_at", `${to}T23:59:59.999Z`);

  query = scopeWorkspaceQuery(query, scope);

  const { count, error } = await query;
  if (error) {
    if (error.code === "42P01") return 0;
    throw new ReportingError("database_error", error.message, 500);
  }

  return count ?? 0;
}

export async function countCampaignsByStatus(
  supabase: SupabaseClient,
  organizationId: string,
  scope: WorkspaceScope,
  status: string
): Promise<number> {
  let query = supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", status);

  query = scopeWorkspaceQuery(query, scope);

  const { count, error } = await query;
  if (error) {
    if (error.code === "42P01") return 0;
    throw new ReportingError("database_error", error.message, 500);
  }

  return count ?? 0;
}
