import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyCampaignInWorkspace } from "@/lib/collaboration/service";
import type { WorkspaceScope } from "@/lib/workspaces/scope";
import { LEGACY_WORKSPACE_SCOPE } from "@/lib/workspaces/scope";
import { SUMMARY_RECORD_KIND } from "./constants";
import type {
  AIGenerationOutput,
  IntelligenceAnalysisContext,
  IntelligenceOverview,
  IntelligenceRecord,
  RecommendationStatus,
} from "./types";

const EMPTY_CLIENT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

function scopeRecommendationsQuery<
  T extends { is: (c: string, v: null) => T; eq: (c: string, v: string) => T },
>(query: T, scope: WorkspaceScope): T {
  if (!scope.isAgency) return query.is("client_workspace_id", null);
  if (scope.clientWorkspaceId) {
    return query.eq("client_workspace_id", scope.clientWorkspaceId);
  }
  return query.eq("client_workspace_id", EMPTY_CLIENT_WORKSPACE_ID);
}

function clientWorkspaceIdForInsert(scope: WorkspaceScope): string | null {
  if (!scope.isAgency) return null;
  return scope.clientWorkspaceId;
}

type DbRow = {
  id: string;
  organization_id: string;
  generated_at: string;
  period_start: string;
  period_end: string;
  type: string;
  title: string;
  observation: string | null;
  recommendation: string | null;
  evidence: unknown;
  confidence: string | null;
  priority: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

function parseEvidence(value: unknown): {
  items: string[];
  recordKind?: string;
  scope?: string;
  campaignId?: string | null;
} {
  if (Array.isArray(value)) {
    return { items: value.filter((v): v is string => typeof v === "string") };
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const items = Array.isArray(obj.items)
      ? obj.items.filter((v): v is string => typeof v === "string")
      : [];
    return {
      items,
      recordKind: typeof obj.recordKind === "string" ? obj.recordKind : undefined,
      scope: typeof obj.scope === "string" ? obj.scope : undefined,
      campaignId:
        typeof obj.campaignId === "string"
          ? obj.campaignId
          : obj.campaignId === null
            ? null
            : undefined,
    };
  }
  return { items: [] };
}

function mapRow(row: DbRow): IntelligenceRecord {
  const evidence = parseEvidence(row.evidence);
  let recordKind: IntelligenceRecord["recordKind"] = "recommendation";
  if (evidence.recordKind === SUMMARY_RECORD_KIND) recordKind = "summary";
  else if (row.recommendation) recordKind = "recommendation";
  else recordKind = "insight";

  return {
    id: row.id,
    organizationId: row.organization_id,
    generatedAt: row.generated_at,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    type: row.type as IntelligenceRecord["type"],
    title: row.title,
    observation: row.observation,
    recommendation: row.recommendation,
    evidence: evidence.items,
    confidence: row.confidence as IntelligenceRecord["confidence"],
    priority: row.priority as IntelligenceRecord["priority"],
    status: row.status as IntelligenceRecord["status"],
    recordKind,
    scope:
      evidence.scope === "campaign"
        ? "campaign"
        : "organization",
    campaignId: evidence.campaignId ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildEvidencePayload(input: {
  items: string[];
  recordKind?: string;
  scope: "organization" | "campaign";
  campaignId: string | null;
}) {
  return {
    recordKind: input.recordKind,
    scope: input.scope,
    campaignId: input.campaignId,
    items: input.items,
  };
}

export async function saveGenerationResults(
  supabase: SupabaseClient,
  organizationId: string,
  workspaceScope: WorkspaceScope,
  context: IntelligenceAnalysisContext,
  aiOutput: AIGenerationOutput,
  generatedAt: string
): Promise<void> {
  const clientWorkspaceId = clientWorkspaceIdForInsert(workspaceScope);
  const rows: Array<Record<string, unknown>> = [];

  rows.push({
    organization_id: organizationId,
    client_workspace_id: clientWorkspaceId,
    generated_at: generatedAt,
    period_start: context.period.from,
    period_end: context.period.to,
    type: "growth",
    title: "Performance summary",
    observation: aiOutput.summary,
    recommendation: null,
    evidence: buildEvidencePayload({
      items: [],
      recordKind: SUMMARY_RECORD_KIND,
      scope: context.scope,
      campaignId: context.campaignId,
    }),
    confidence: null,
    priority: null,
    status: "new",
  });

  for (const insight of aiOutput.insights) {
    rows.push({
      organization_id: organizationId,
      client_workspace_id: clientWorkspaceId,
      generated_at: generatedAt,
      period_start: context.period.from,
      period_end: context.period.to,
      type: insight.type,
      title: insight.title,
      observation: insight.observation,
      recommendation: null,
      evidence: buildEvidencePayload({
        items: insight.evidence,
        scope: context.scope,
        campaignId: context.campaignId,
      }),
      confidence: insight.confidence,
      priority: null,
      status: "new",
    });
  }

  for (const rec of aiOutput.recommendations) {
    rows.push({
      organization_id: organizationId,
      client_workspace_id: clientWorkspaceId,
      generated_at: generatedAt,
      period_start: context.period.from,
      period_end: context.period.to,
      type: rec.type,
      title: rec.title,
      observation: rec.reason,
      recommendation: rec.action,
      evidence: buildEvidencePayload({
        items: rec.evidence,
        scope: context.scope,
        campaignId: context.campaignId,
      }),
      confidence: null,
      priority: rec.priority,
      status: "new",
    });
  }

  const { error } = await supabase.from("ai_recommendations").insert(rows);
  if (error) throw new Error(error.message);
}

export async function listRecommendations(
  supabase: SupabaseClient,
  organizationId: string,
  workspaceScope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE,
  filters?: {
    status?: string | null;
    type?: string | null;
    priority?: string | null;
    campaignId?: string | null;
    limit?: number;
  }
): Promise<IntelligenceRecord[]> {
  if (filters?.campaignId) {
    await verifyCampaignInWorkspace(
      supabase,
      filters.campaignId,
      organizationId,
      workspaceScope
    );
  }

  let query = supabase
    .from("ai_recommendations")
    .select("*")
    .eq("organization_id", organizationId)
    .order("generated_at", { ascending: false })
    .limit(filters?.limit ?? 50);

  query = scopeRecommendationsQuery(query, workspaceScope);

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.type && filters.type !== "all") {
    query = query.eq("type", filters.type);
  }
  if (filters?.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority);
  }

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }

  let records = (data ?? []).map((row) => mapRow(row as DbRow));

  if (filters?.campaignId) {
    records = records.filter(
      (record) =>
        record.scope === "campaign" &&
        record.campaignId === filters.campaignId
    );
  } else {
    records = records.filter((record) => record.scope === "organization");
  }

  return records;
}

export async function getLatestOverview(
  supabase: SupabaseClient,
  organizationId: string,
  workspaceScope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE,
  options?: { campaignId?: string | null }
): Promise<IntelligenceOverview> {
  const records = await listRecommendations(supabase, organizationId, workspaceScope, {
    campaignId: options?.campaignId ?? null,
    limit: 100,
  });

  if (records.length === 0) {
    return {
      summary: null,
      insights: [],
      recommendations: [],
      generatedAt: null,
      period: null,
      dataAvailability: null,
      hasGeneration: false,
    };
  }

  const latestGeneratedAt = records[0]?.generatedAt;
  const batch = records.filter((r) => r.generatedAt === latestGeneratedAt);

  const summaryRecord = batch.find((r) => r.recordKind === "summary");
  const insights = batch.filter((r) => r.recordKind === "insight");
  const recommendations = batch.filter((r) => r.recordKind === "recommendation");

  return {
    summary: summaryRecord?.observation ?? null,
    insights,
    recommendations,
    generatedAt: latestGeneratedAt ?? null,
    period: summaryRecord
      ? { from: summaryRecord.periodStart, to: summaryRecord.periodEnd }
      : batch[0]
        ? { from: batch[0].periodStart, to: batch[0].periodEnd }
        : null,
    dataAvailability: null,
    hasGeneration: true,
  };
}

export async function updateRecommendationStatus(
  supabase: SupabaseClient,
  organizationId: string,
  workspaceScope: WorkspaceScope,
  recommendationId: string,
  status: RecommendationStatus
): Promise<IntelligenceRecord> {
  let query = supabase
    .from("ai_recommendations")
    .update({ status })
    .eq("id", recommendationId)
    .eq("organization_id", organizationId);

  query = scopeRecommendationsQuery(query, workspaceScope);

  const { data, error } = await query.select("*").single();

  if (error || !data) {
    throw new Error(error?.message ?? "Recommendation not found.");
  }

  return mapRow(data as DbRow);
}

export async function getDashboardRecommendations(
  supabase: SupabaseClient,
  organizationId: string,
  workspaceScope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE,
  limit = 3
): Promise<IntelligenceRecord[]> {
  const records = await listRecommendations(supabase, organizationId, workspaceScope, {
    limit: 20,
  });

  return records
    .filter((r) => r.recordKind === "recommendation" && r.status === "new")
    .slice(0, limit);
}
