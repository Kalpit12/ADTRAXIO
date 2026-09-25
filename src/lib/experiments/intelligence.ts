import { recordUsageEvent } from "@/lib/billing/service";
import type { AssistantContext } from "@/lib/assistant/types";
import { getCompactBrandPrompt } from "@/lib/assistant/brand-brain/loader";
import { assessEvidenceQuality } from "./evidence";
import { evaluateExperimentHealth } from "./health";
import { queryExperimentHistory } from "./history";
import { compareVariants } from "./comparison";
import { detectExperimentConflicts } from "./decision";
import { findRelatedExperiments, rankRelatedIds } from "./relationships";
import { buildExperimentSummary, buildDeterministicIntelligenceInterpretation } from "./summaries";
import { assertExperimentAiEntitlement, getExperiment } from "./service";
import { interpretExperimentIntelligenceWithAI } from "./openai";
import type {
  ExperimentConflictFinding,
  ExperimentHistoryItem,
  ExperimentIntelligenceSummary,
  EvidenceQualityLevel,
  RelatedExperimentRef,
} from "./types";

export async function listExperimentHistory(
  ctx: AssistantContext,
  options?: Parameters<typeof queryExperimentHistory>[1]
): Promise<ExperimentHistoryItem[]> {
  return queryExperimentHistory(ctx, options);
}

export async function getExperimentIntelligence(
  ctx: AssistantContext,
  experimentId: string
): Promise<ExperimentIntelligenceSummary | null> {
  const exp = await getExperiment(ctx, experimentId);
  if (!exp) return null;
  const variants = exp.variants ?? [];
  const comparison =
    exp.allocation.lastComparison ?? compareVariants(exp, variants);
  const health = evaluateExperimentHealth(exp, variants);
  const evidenceQuality = assessEvidenceQuality(exp, variants, comparison);
  const { evaluateDataQuality } = await import("./data-quality");
  const { validateExperimentAttribution } = await import("./attribution");
  const dataQuality = evaluateDataQuality(exp, variants);
  const attribution = validateExperimentAttribution(exp, variants);
  const relatedExperiments = await findRelatedExperiments(ctx, exp);
  const conflictingFindings = await detectExperimentConflicts(ctx, relatedExperiments);
  const contextSnapshot =
    exp.contextSnapshot && "version" in exp.contextSnapshot
      ? (exp.contextSnapshot as import("./types").ExperimentContextSnapshot)
      : null;
  const measurementSnapshot =
    exp.measurementSnapshot && "version" in exp.measurementSnapshot
      ? (exp.measurementSnapshot as import("./types").ExperimentMeasurementSnapshot)
      : null;
  return buildExperimentSummary({
    experiment: exp,
    variants,
    health,
    evidenceQuality,
    comparison,
    relatedExperiments,
    conflictingFindings,
    dataQuality,
    attribution,
    contextSnapshot,
    measurementSnapshot,
  });
}

export async function getRelatedExperiments(
  ctx: AssistantContext,
  experimentId: string
): Promise<RelatedExperimentRef[]> {
  const exp = await getExperiment(ctx, experimentId);
  if (!exp) return [];
  return findRelatedExperiments(ctx, exp);
}

export async function getExperimentConflicts(
  ctx: AssistantContext,
  experimentId: string
): Promise<ExperimentConflictFinding[]> {
  const related = await getRelatedExperiments(ctx, experimentId);
  return detectExperimentConflicts(ctx, related);
}

export async function getExperimentSummary(
  ctx: AssistantContext,
  experimentId: string
): Promise<ExperimentIntelligenceSummary | null> {
  return getExperimentIntelligence(ctx, experimentId);
}

export async function listExperimentIntelligenceSummaries(
  ctx: AssistantContext,
  limit = 5
): Promise<ExperimentIntelligenceSummary[]> {
  const history = await listExperimentHistory(ctx, { limit });
  const summaries: ExperimentIntelligenceSummary[] = [];
  for (const item of history) {
    const summary = await getExperimentIntelligence(ctx, item.id);
    if (summary) summaries.push(summary);
  }
  return summaries;
}

export async function syncExperimentIntelligence(
  ctx: AssistantContext,
  experimentId: string,
  options?: { runAi?: boolean }
): Promise<void> {
  const exp = await getExperiment(ctx, experimentId);
  if (!exp) return;

  const variants = exp.variants ?? [];
  const comparison =
    exp.allocation.lastComparison ?? compareVariants(exp, variants);
  const health = evaluateExperimentHealth(exp, variants);
  const evidenceQuality = assessEvidenceQuality(exp, variants, comparison);
  const related = await findRelatedExperiments(ctx, exp);
  const relatedIds = rankRelatedIds(related);
  const { evaluateDataQuality } = await import("./data-quality");
  const { validateExperimentAttribution } = await import("./attribution");
  const dataQuality = evaluateDataQuality(exp, variants);
  const attribution = validateExperimentAttribution(exp, variants);
  const contextSnapshot =
    exp.contextSnapshot && "version" in exp.contextSnapshot
      ? (exp.contextSnapshot as import("./types").ExperimentContextSnapshot)
      : null;
  const measurementSnapshot =
    exp.measurementSnapshot && "version" in exp.measurementSnapshot
      ? (exp.measurementSnapshot as import("./types").ExperimentMeasurementSnapshot)
      : null;

  let interpretation = exp.interpretation;
  let interpretationStatus = exp.interpretationStatus;

  const shouldAi =
    options?.runAi &&
    exp.status === "completed" &&
    interpretationStatus !== "complete";

  if (shouldAi) {
    try {
      await assertExperimentAiEntitlement(ctx);
      const brandBrain = await getCompactBrandPrompt(ctx, { mode: "strategy" });
      const conflicts = await detectExperimentConflicts(ctx, related);
      interpretation = await interpretExperimentIntelligenceWithAI({
        summary: buildExperimentSummary({
          experiment: exp,
          variants,
          health,
          evidenceQuality,
          comparison,
          relatedExperiments: related,
          conflictingFindings: conflicts,
          dataQuality,
          attribution,
          contextSnapshot,
          measurementSnapshot,
        }),
        brandBrain,
      });
      await recordUsageEvent(ctx.organizationId, "ai_generation");
      interpretationStatus = "complete";
    } catch {
      interpretation = buildDeterministicIntelligenceInterpretation({
        evidenceQuality,
        comparison,
      });
      interpretationStatus = "skipped";
    }
  } else if (exp.status === "completed" && interpretationStatus === "pending") {
    interpretation = buildDeterministicIntelligenceInterpretation({
      evidenceQuality,
      comparison,
    });
    interpretationStatus = "deterministic";
  }

  await ctx.supabase
    .from("ai_experiments")
    .update({
      readiness_status: health.status,
      evidence_quality: evidenceQuality.level,
      related_experiment_ids: relatedIds,
      interpretation_json: interpretation,
      interpretation_status: interpretationStatus,
      decision_notes: evidenceQuality.summary.slice(0, 2000),
      updated_at: new Date().toISOString(),
    })
    .eq("id", experimentId)
    .eq("organization_id", ctx.organizationId);
}

export async function getExperimentsReadyToMeasure(
  ctx: AssistantContext
): Promise<string[]> {
  const { data } = await ctx.supabase
    .from("ai_experiments")
    .select("id, started_at, minimum_observation_days, status")
    .eq("organization_id", ctx.organizationId)
    .eq("status", "running");

  const ids: string[] = [];
  const now = Date.now();
  for (const row of data ?? []) {
    if (!row.started_at) continue;
    const endMs =
      new Date(row.started_at as string).getTime() +
      (row.minimum_observation_days as number) * 24 * 60 * 60 * 1000;
    if (now >= endMs) ids.push(row.id as string);
  }
  return ids;
}

export function isHistoricalEvidenceStatus(
  status: string,
  evidenceQuality: EvidenceQualityLevel | null
): boolean {
  return status === "completed" && evidenceQuality != null;
}
