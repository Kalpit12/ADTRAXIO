import type { AssistantContext } from "@/lib/assistant/types";
import {
  buildDeterministicRecommendations,
  buildDeterministicInsights,
  buildMinimalBrief,
} from "./analysis";
import { buildRecommendationPrompt } from "./actions";
import { gatherAgentFacts } from "./context";
import { interpretFactsWithAI } from "./openai";
import { maybeNotifyGrowthBrief } from "./notify";
import { applyClientWorkspaceScope } from "@/lib/workspaces/query-scope";
import { clientWorkspaceIdForBrief } from "./scope";
import type {
  GrowthBriefMetrics,
  GrowthBriefRecord,
  GrowthBriefStatus,
  GrowthBriefSummary,
  GrowthBriefType,
  GrowthInsight,
  GrowthRecommendation,
} from "./types";

type BriefRow = {
  id: string;
  organization_id: string;
  client_workspace_id: string | null;
  period_start: string;
  period_end: string;
  brief_type: string;
  status: string;
  summary: string;
  insights: unknown;
  recommendations: unknown;
  metrics: unknown;
  generated_at: string;
  created_at: string;
  updated_at: string;
};

function mapBrief(row: BriefRow): GrowthBriefRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientWorkspaceId: row.client_workspace_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    briefType: row.brief_type as GrowthBriefType,
    status: row.status as GrowthBriefStatus,
    summary: row.summary,
    insights: Array.isArray(row.insights)
      ? (row.insights as GrowthBriefRecord["insights"])
      : [],
    recommendations: Array.isArray(row.recommendations)
      ? (row.recommendations as GrowthBriefRecord["recommendations"])
      : [],
    metrics: (row.metrics ?? {}) as GrowthBriefMetrics,
    generatedAt: row.generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function attachAssistantPrompts(
  recommendations: GrowthRecommendation[]
): GrowthRecommendation[] {
  return recommendations.map((rec) => ({
    ...rec,
    assistantPrompt:
      rec.assistantPrompt ??
      buildRecommendationPrompt(rec.actionType, { detail: rec.reason }),
  }));
}

function buildMetricsFromFacts(
  facts: Awaited<ReturnType<typeof gatherAgentFacts>>
): GrowthBriefMetrics {
  const engagement = facts.metricChanges.find((m) => m.metric === "engagement");
  const reach = facts.metricChanges.find((m) => m.metric === "reach");
  const impressions = facts.metricChanges.find((m) => m.metric === "impressions");
  return {
    periodLabel: facts.periodLabel,
    engagementChangePercent: engagement?.changePercent ?? null,
    reachChangePercent: reach?.changePercent ?? null,
    impressionsChangePercent: impressions?.changePercent ?? null,
    failedPostsCount: facts.failedPosts.length,
    scheduledPostsCount: facts.scheduledUpcomingCount,
    topContentCount: facts.topContent.length,
    connectedAccounts: facts.dataGaps.includes("No connected social platforms.")
      ? 0
      : 1,
  };
}

export async function findExistingBrief(
  ctx: AssistantContext,
  briefType: GrowthBriefType,
  periodStart: string,
  periodEnd: string
): Promise<GrowthBriefRecord | null> {
  const { data, error } = await applyClientWorkspaceScope(
    ctx.supabase
      .from("ai_growth_briefs")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .eq("brief_type", briefType)
      .eq("period_start", periodStart)
      .eq("period_end", periodEnd),
    ctx.scope
  ).maybeSingle();
  if (error) {
    if (error.code === "42P01") return null;
    throw new Error(error.message);
  }
  return data ? mapBrief(data as BriefRow) : null;
}

export async function getGrowthBriefById(
  ctx: AssistantContext,
  id: string
): Promise<GrowthBriefRecord | null> {
  const { data, error } = await applyClientWorkspaceScope(
    ctx.supabase
      .from("ai_growth_briefs")
      .select("*")
      .eq("id", id)
      .eq("organization_id", ctx.organizationId),
    ctx.scope
  ).maybeSingle();
  if (error) {
    if (error.code === "42P01") return null;
    throw new Error(error.message);
  }
  return data ? mapBrief(data as BriefRow) : null;
}

export async function listGrowthBriefs(
  ctx: AssistantContext,
  options?: { limit?: number; briefType?: GrowthBriefType }
): Promise<GrowthBriefRecord[]> {
  let scoped = applyClientWorkspaceScope(
    ctx.supabase
      .from("ai_growth_briefs")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .neq("status", "archived")
      .order("generated_at", { ascending: false })
      .limit(options?.limit ?? 20),
    ctx.scope
  );
  if (options?.briefType) {
    scoped = scoped.eq("brief_type", options.briefType);
  }
  const { data, error } = await scoped;
  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => mapBrief(row as BriefRow));
}

export async function getLatestGrowthBrief(
  ctx: AssistantContext,
  briefType?: GrowthBriefType
): Promise<GrowthBriefRecord | null> {
  const list = await listGrowthBriefs(ctx, { limit: 1, briefType });
  return list[0] ?? null;
}

export function toGrowthBriefSummary(
  brief: GrowthBriefRecord
): GrowthBriefSummary {
  const topInsightTitles = brief.insights.slice(0, 3).map((i) => i.title);
  const nextRecommendation = brief.recommendations[0] ?? null;
  return {
    id: brief.id,
    briefType: brief.briefType,
    summary: brief.summary,
    generatedAt: brief.generatedAt,
    engagementChangePercent: brief.metrics.engagementChangePercent ?? null,
    failedPostsCount: brief.metrics.failedPostsCount ?? 0,
    topInsightTitles,
    nextRecommendation,
  };
}

async function saveBrief(
  ctx: AssistantContext,
  input: {
    briefType: GrowthBriefType;
    periodStart: string;
    periodEnd: string;
    summary: string;
    insights: GrowthInsight[];
    recommendations: GrowthRecommendation[];
    metrics: GrowthBriefMetrics;
  }
): Promise<GrowthBriefRecord> {
  const now = new Date().toISOString();
  const payload = {
    organization_id: ctx.organizationId,
    client_workspace_id: clientWorkspaceIdForBrief(ctx),
    period_start: input.periodStart,
    period_end: input.periodEnd,
    brief_type: input.briefType,
    status: "generated",
    summary: input.summary,
    insights: input.insights,
    recommendations: attachAssistantPrompts(input.recommendations),
    metrics: input.metrics,
    generated_at: now,
    updated_at: now,
  };

  const { data, error } = await ctx.supabase
    .from("ai_growth_briefs")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    if (error.code === "42P01") {
      throw new Error("Growth brief storage is not available. Run migration 027.");
    }
    if (error.code === "23505") {
      const existing = await findExistingBrief(
        ctx,
        input.briefType,
        input.periodStart,
        input.periodEnd
      );
      if (existing) return existing;
    }
    throw new Error(error.message);
  }

  const record = mapBrief(data as BriefRow);
  await maybeNotifyGrowthBrief(ctx, record);
  return record;
}

export async function generateGrowthBrief(
  ctx: AssistantContext,
  briefType: GrowthBriefType,
  options?: { regenerate?: boolean }
): Promise<GrowthBriefRecord> {
  const facts = await gatherAgentFacts(ctx, briefType);

  if (!facts.hasSufficientData) {
    const minimal = buildMinimalBrief(facts);
    return saveBrief(ctx, {
      briefType,
      periodStart: facts.periodStart,
      periodEnd: facts.periodEnd,
      summary: minimal.summary,
      insights: minimal.insights,
      recommendations: minimal.recommendations,
      metrics: buildMetricsFromFacts(facts),
    });
  }

  const existing = await findExistingBrief(
    ctx,
    briefType,
    facts.periodStart,
    facts.periodEnd
  );
  if (existing && !options?.regenerate) {
    return existing;
  }
  if (existing && options?.regenerate) {
    await ctx.supabase
      .from("ai_growth_briefs")
      .delete()
      .eq("id", existing.id)
      .eq("organization_id", ctx.organizationId);
  }

  let summary: string;
  let insights: GrowthInsight[];
  let recommendations: GrowthRecommendation[];

  if (!facts.hasMeaningfulChange) {
    const minimal = buildMinimalBrief(facts);
    summary = minimal.summary;
    insights = minimal.insights;
    recommendations = minimal.recommendations;
  } else {
    try {
      const ai = await interpretFactsWithAI(facts);
      summary = ai.summary;
      insights =
        ai.insights.length > 0 ? ai.insights : buildDeterministicInsights(facts);
      recommendations =
        ai.recommendations.length > 0
          ? ai.recommendations
          : buildDeterministicRecommendations(facts, insights);
    } catch {
      const minimal = buildMinimalBrief(facts);
      summary = minimal.summary;
      insights = minimal.insights;
      recommendations = minimal.recommendations;
    }
  }

  const { listExperimentIntelligenceSummaries } = await import(
    "@/lib/experiments/intelligence"
  );
  const { formatExperimentEvidenceForBrief } = await import(
    "@/lib/experiments/summaries"
  );
  const experimentSummaries = await listExperimentIntelligenceSummaries(ctx, 2);
  const experimentNote = formatExperimentEvidenceForBrief(experimentSummaries);
  const { getCrossExperimentEvidence } = await import("@/lib/evidence/patterns");
  const { formatCrossExperimentEvidenceForBrief } = await import("@/lib/evidence/format");
  const crossNote = formatCrossExperimentEvidenceForBrief(
    await getCrossExperimentEvidence(ctx, { limit: 20 })
  );
  if (experimentNote) {
    insights = [
      ...insights,
      {
        type: "growth_opportunity" as const,
        title: "Experiment evidence",
        observation: experimentNote,
        evidence: [experimentNote],
        severity: "info" as const,
        confidence: "medium" as const,
      },
    ];
  }
  if (crossNote) {
    insights = [
      ...insights,
      {
        type: "growth_opportunity" as const,
        title: "Cross-experiment evidence",
        observation: crossNote,
        evidence: [crossNote],
        severity: "info" as const,
        confidence: "low" as const,
      },
    ];
  }

  const { listOptimizationProposals } = await import("@/lib/optimization/service");
  const pendingProposals = await listOptimizationProposals(ctx, 5);
  const executedPending = pendingProposals.filter(
    (p) => p.status === "executed" && p.execution?.status === "pending_measurement"
  );
  if (executedPending.length > 0) {
    insights = [
      ...insights,
      {
        type: "growth_opportunity" as const,
        title: "Optimization execution",
        observation:
          "An approved allocation change was executed and is awaiting measurement.",
        evidence: executedPending.map(
          (p) => `execution ${p.execution?.id ?? p.id} · experiment ${p.sourceId}`
        ),
        severity: "info" as const,
        confidence: "low" as const,
      },
    ];
  }

  const { listOptimizationOutcomes } = await import("@/lib/optimization/outcome");
  const measuredOutcomes = (await listOptimizationOutcomes(ctx, { limit: 5 })).filter(
    (o) => o.status === "measured" || o.status === "evaluated" || o.status === "inconclusive"
  );
  for (const o of measuredOutcomes.slice(0, 3)) {
    const limitationNote =
      o.limitations.length > 0 ? ` Limitations: ${o.limitations[0]}` : "";
    insights = [
      ...insights,
      {
        type: "growth_opportunity" as const,
        title: "Optimization outcome",
        observation: `Your allocation change has now been measured. ${o.outcomeSummary ?? ""}${limitationNote}`,
        evidence: [
          o.executionSummary ?? "",
          `experiment ${o.experimentId}`,
          `evidence ${o.evidenceQuality ?? "—"}`,
        ].filter(Boolean),
        severity: "info" as const,
        confidence: "low" as const,
      },
    ];
  }

  const reviewable = pendingProposals.filter((p) =>
    ["draft", "review", "approved"].includes(p.status)
  );
  if (reviewable.length > 0) {
    insights = [
      ...insights,
      {
        type: "growth_opportunity" as const,
        title: "Optimization opportunity",
        observation:
          "An optimization opportunity is available for review in ADTRAXIO (no automatic execution).",
        evidence: reviewable.map(
          (p) => `${p.proposalType} · ${p.eligibility.status} · proposal ${p.id}`
        ),
        severity: "info" as const,
        confidence: "low" as const,
      },
    ];
  }

  return saveBrief(ctx, {
    briefType,
    periodStart: facts.periodStart,
    periodEnd: facts.periodEnd,
    summary,
    insights,
    recommendations,
    metrics: buildMetricsFromFacts(facts),
  });
}

export async function updateGrowthBriefStatus(
  ctx: AssistantContext,
  id: string,
  status: GrowthBriefStatus
): Promise<GrowthBriefRecord | null> {
  const existing = await getGrowthBriefById(ctx, id);
  if (!existing) return null;

  const { data, error } = await ctx.supabase
    .from("ai_growth_briefs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", ctx.organizationId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapBrief(data as BriefRow);
}
