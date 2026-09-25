import { checkLimit } from "@/lib/billing/entitlements";
import { recordUsageEvent } from "@/lib/billing/service";
import { ensureOperationalScope } from "@/lib/assistant/permissions";
import type { AssistantContext } from "@/lib/assistant/types";
import { applyClientWorkspaceScope } from "@/lib/workspaces/query-scope";
import { captureContentBaseline, captureWorkspaceBaseline } from "@/lib/learning/baseline";
import { insertLearningOutcome, measureLearningOutcome } from "@/lib/learning/service";
import { insertExecutionPlan, newStep } from "@/lib/execution/plan-service";
import { verifyContentInWorkspace } from "@/lib/execution/validate-state";
import { allocationRequiresHundredPercent, validateFixedSplitAllocation } from "./allocation";
import { compareVariants } from "./comparison";
import { generateExperimentDraftWithAI, interpretExperimentWithAI } from "./openai";
import { getCompactBrandPrompt } from "@/lib/assistant/brand-brain/loader";
import type {
  AllocationJson,
  ExperimentAiDraftOutput,
  ExperimentDraftVariantInput,
  ExperimentRecord,
  ExperimentStatus,
  ExperimentVariantRecord,
  VariantStatus,
} from "./types";
import { ExperimentValidationError, validateVariantInputs } from "./validation";

type ExperimentRow = {
  id: string;
  organization_id: string;
  client_workspace_id: string | null;
  created_by: string;
  name: string;
  objective: string;
  hypothesis: string;
  platform: string | null;
  status: string;
  allocation_type: string;
  allocation_json: unknown;
  success_metric: string;
  secondary_metrics: unknown;
  sample_target: number | null;
  minimum_observation_days: number;
  strategic_plan_id: string | null;
  growth_brief_id: string | null;
  interpretation_json: unknown;
  audience_context?: unknown;
  platform_context?: unknown;
  content_context?: unknown;
  readiness_status?: string | null;
  evidence_quality?: string | null;
  interpretation_status?: string;
  decision_notes?: string | null;
  related_experiment_ids?: unknown;
  context_snapshot_json?: unknown;
  measurement_snapshot_json?: unknown;
  experiment_evaluation_json?: unknown;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

type VariantRow = {
  id: string;
  experiment_id: string;
  organization_id: string;
  client_workspace_id: string | null;
  name: string;
  description: string;
  variant_key: string;
  content_id: string | null;
  campaign_id: string | null;
  scheduled_post_id: string | null;
  execution_plan_id: string | null;
  allocation_percent: number;
  baseline_json: unknown;
  outcome_json: unknown;
  result_json: unknown;
  status: string;
  created_at: string;
  updated_at: string;
};

function clientWorkspaceIdForInsert(ctx: AssistantContext): string | null {
  return ctx.isAgency ? ctx.clientWorkspaceId : null;
}

function mapVariant(row: VariantRow): ExperimentVariantRecord {
  return {
    id: row.id,
    experimentId: row.experiment_id,
    organizationId: row.organization_id,
    clientWorkspaceId: row.client_workspace_id,
    name: row.name,
    description: row.description,
    variantKey: row.variant_key,
    contentId: row.content_id,
    campaignId: row.campaign_id,
    scheduledPostId: row.scheduled_post_id,
    executionPlanId: row.execution_plan_id,
    allocationPercent: Number(row.allocation_percent),
    baseline: (row.baseline_json as ExperimentVariantRecord["baseline"]) ?? {
      capturedAt: new Date().toISOString(),
      windowDays: 14,
      impressions: null,
      reach: null,
      engagement: null,
      likes: null,
      comments: null,
      shares: null,
      saves: null,
      views: null,
      postsPublished: null,
      publishingFrequencyPerWeek: null,
      campaignActiveCount: null,
    },
    outcome: (row.outcome_json as ExperimentVariantRecord["outcome"]) ?? {
      capturedAt: new Date().toISOString(),
      windowDays: 14,
      impressions: null,
      reach: null,
      engagement: null,
      likes: null,
      comments: null,
      shares: null,
      saves: null,
      views: null,
      postsPublished: null,
      publishingFrequencyPerWeek: null,
      campaignActiveCount: null,
    },
    result: (row.result_json as Record<string, unknown>) ?? {},
    status: row.status as VariantStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapExperiment(row: ExperimentRow, variants?: ExperimentVariantRecord[]): ExperimentRecord {
  const allocation = (row.allocation_json as AllocationJson) ?? { version: 1, splits: [] };
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientWorkspaceId: row.client_workspace_id,
    createdBy: row.created_by,
    name: row.name,
    objective: row.objective,
    hypothesis: row.hypothesis,
    platform: row.platform,
    status: row.status as ExperimentStatus,
    allocationType: row.allocation_type as ExperimentRecord["allocationType"],
    allocation,
    successMetric: row.success_metric,
    secondaryMetrics: Array.isArray(row.secondary_metrics)
      ? (row.secondary_metrics as string[])
      : [],
    sampleTarget: row.sample_target,
    minimumObservationDays: row.minimum_observation_days,
    strategicPlanId: row.strategic_plan_id,
    growthBriefId: row.growth_brief_id,
    interpretation: (row.interpretation_json as ExperimentRecord["interpretation"]) ?? {},
    audienceContext: (row.audience_context as Record<string, unknown>) ?? {},
    platformContext: (row.platform_context as Record<string, unknown>) ?? {},
    contentContext: (row.content_context as Record<string, unknown>) ?? {},
    readinessStatus: row.readiness_status ?? null,
    evidenceQuality: (row.evidence_quality as ExperimentRecord["evidenceQuality"]) ?? null,
    interpretationStatus: row.interpretation_status ?? "pending",
    decisionNotes: row.decision_notes ?? null,
    relatedExperimentIds: Array.isArray(row.related_experiment_ids)
      ? (row.related_experiment_ids as string[])
      : [],
    contextSnapshot: (row.context_snapshot_json as ExperimentRecord["contextSnapshot"]) ?? {},
    measurementSnapshot: (row.measurement_snapshot_json as ExperimentRecord["measurementSnapshot"]) ?? {},
    experimentEvaluation:
      (row.experiment_evaluation_json as ExperimentRecord["experimentEvaluation"]) ?? {},
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    variants,
  };
}

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function assertExperimentAiEntitlement(ctx: AssistantContext): Promise<void> {
  const { count } = await ctx.supabase
    .from("billing_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", ctx.organizationId)
    .eq("metric", "ai_generation")
    .gte("created_at", monthStartIso());
  await checkLimit(ctx.supabase, ctx.organizationId, "ai_generation", count ?? 0);
}

async function loadVariants(
  ctx: AssistantContext,
  experimentId: string
): Promise<ExperimentVariantRecord[]> {
  const { data, error } = await applyClientWorkspaceScope(
    ctx.supabase
      .from("ai_experiment_variants")
      .select("*")
      .eq("experiment_id", experimentId)
      .eq("organization_id", ctx.organizationId)
      .order("variant_key", { ascending: true }),
    ctx.scope
  );
  if (error) return [];
  return (data ?? []).map((r) => mapVariant(r as VariantRow));
}

export async function getExperiment(
  ctx: AssistantContext,
  id: string
): Promise<ExperimentRecord | null> {
  const { data, error } = await applyClientWorkspaceScope(
    ctx.supabase
      .from("ai_experiments")
      .select("*")
      .eq("id", id)
      .eq("organization_id", ctx.organizationId),
    ctx.scope
  ).maybeSingle();
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return null;
    throw new Error(error.message);
  }
  if (!data) return null;
  const variants = await loadVariants(ctx, id);
  return mapExperiment(data as ExperimentRow, variants);
}

export async function listExperiments(
  ctx: AssistantContext,
  options?: { limit?: number; status?: ExperimentStatus }
): Promise<ExperimentRecord[]> {
  let query = applyClientWorkspaceScope(
    ctx.supabase
      .from("ai_experiments")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: false })
      .limit(options?.limit ?? 20),
    ctx.scope
  );
  if (options?.status) query = query.eq("status", options.status);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((row) => mapExperiment(row as ExperimentRow));
}

export async function listCompletedExperiments(
  ctx: AssistantContext,
  limit = 8
): Promise<ExperimentRecord[]> {
  const items = await listExperiments(ctx, { limit, status: "completed" });
  const withVariants: ExperimentRecord[] = [];
  for (const e of items) {
    const full = await getExperiment(ctx, e.id);
    if (full) withVariants.push(full);
  }
  return withVariants;
}

export async function createExperimentFromDraft(
  ctx: AssistantContext,
  input: {
    draft: ExperimentAiDraftOutput | {
      name: string;
      objective: string;
      hypothesis: string;
      platform?: string | null;
      successMetric: string;
      secondaryMetrics?: string[];
      minimumObservationDays?: number;
      sampleTarget?: number | null;
      allocationType?: "manual" | "fixed_split";
      variants: ExperimentDraftVariantInput[];
      strategicPlanId?: string | null;
      growthBriefId?: string | null;
    };
  }
): Promise<ExperimentRecord> {
  ensureOperationalScope(ctx.scope);
  validateVariantInputs(input.draft.variants);

  const allocation =
    input.draft.allocationType === "fixed_split"
      ? validateFixedSplitAllocation(
          input.draft.variants.map((v) => ({
            variantKey: v.variantKey,
            allocationPercent: v.allocationPercent,
          }))
        )
      : { version: 1, splits: [] };

  const { data: exp, error } = await ctx.supabase
    .from("ai_experiments")
    .insert({
      organization_id: ctx.organizationId,
      client_workspace_id: clientWorkspaceIdForInsert(ctx),
      created_by: ctx.user.id,
      name: input.draft.name,
      objective: input.draft.objective,
      hypothesis: input.draft.hypothesis,
      platform: input.draft.platform ?? null,
      status: "draft",
      allocation_type: input.draft.allocationType ?? "fixed_split",
      allocation_json: allocation,
      success_metric: input.draft.successMetric,
      secondary_metrics: input.draft.secondaryMetrics ?? [],
      sample_target: input.draft.sampleTarget ?? null,
      minimum_observation_days: input.draft.minimumObservationDays ?? 14,
      strategic_plan_id:
        "strategicPlanId" in input.draft ? input.draft.strategicPlanId ?? null : null,
      growth_brief_id:
        "growthBriefId" in input.draft ? input.draft.growthBriefId ?? null : null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") {
      throw new Error("Experiments tables missing. Apply migration 032.");
    }
    throw new Error(error.message);
  }

  for (const v of input.draft.variants) {
    const { error: vErr } = await ctx.supabase.from("ai_experiment_variants").insert({
      experiment_id: exp.id,
      organization_id: ctx.organizationId,
      client_workspace_id: clientWorkspaceIdForInsert(ctx),
      name: v.name,
      description: v.description ?? "",
      variant_key: v.variantKey.trim().toUpperCase(),
      allocation_percent: v.allocationPercent,
      status: "draft",
    });
    if (vErr) throw new Error(vErr.message);
  }

  const full = await getExperiment(ctx, exp.id);
  if (!full) throw new Error("Failed to load experiment.");
  try {
    const { resolveExperimentContext } = await import("./context-resolver");
    const resolved = await resolveExperimentContext(ctx, full, full.variants ?? []);
    await ctx.supabase
      .from("ai_experiments")
      .update({
        platform: resolved.platform ?? full.platform,
        audience_context: resolved.audienceContext,
        platform_context: resolved.platformContext,
        content_context: resolved.contentContext,
        updated_at: new Date().toISOString(),
      })
      .eq("id", full.id);
  } catch {
    /* context resolution is best-effort at create */
  }
  return (await getExperiment(ctx, exp.id))!;
}

export async function createExperimentDraftWithAI(
  ctx: AssistantContext,
  input: { userRequest: string; platform?: string | null }
): Promise<ExperimentRecord> {
  await assertExperimentAiEntitlement(ctx);
  const brandBrain = await getCompactBrandPrompt(ctx, { mode: "strategy" });
  const draft = await generateExperimentDraftWithAI({
    userRequest: input.userRequest,
    brandBrain,
    platform: input.platform,
  });
  const record = await createExperimentFromDraft(ctx, { draft });
  await recordUsageEvent(ctx.organizationId, "ai_generation");
  return record;
}

export async function submitExperimentForReview(
  ctx: AssistantContext,
  experimentId: string
): Promise<ExperimentRecord> {
  const exp = await getExperiment(ctx, experimentId);
  if (!exp) throw new ExperimentValidationError("Experiment not found.");
  if (exp.status !== "draft") {
    throw new ExperimentValidationError("Only draft experiments can be submitted.");
  }
  const variants = exp.variants ?? [];
  validateVariantInputs(
    variants.map((v) => ({
      name: v.name,
      variantKey: v.variantKey,
      allocationPercent: v.allocationPercent,
    }))
  );
  const { error } = await ctx.supabase
    .from("ai_experiments")
    .update({ status: "review", updated_at: new Date().toISOString() })
    .eq("id", experimentId)
    .eq("organization_id", ctx.organizationId);
  if (error) throw new Error(error.message);
  return (await getExperiment(ctx, experimentId))!;
}

export async function approveExperiment(
  ctx: AssistantContext,
  experimentId: string
): Promise<ExperimentRecord> {
  const exp = await getExperiment(ctx, experimentId);
  if (!exp) throw new ExperimentValidationError("Experiment not found.");
  if (exp.status !== "review" && exp.status !== "draft") {
    throw new ExperimentValidationError("Experiment cannot be approved from this status.");
  }
  const variants = exp.variants ?? [];
  if (variants.length < 2) {
    throw new ExperimentValidationError("At least two variants are required.");
  }
  const allocation = validateFixedSplitAllocation(variants);
  const { error } = await ctx.supabase
    .from("ai_experiments")
    .update({
      status: "approved",
      allocation_json: allocation,
      allocation_type: "fixed_split",
      updated_at: new Date().toISOString(),
    })
    .eq("id", experimentId)
    .eq("organization_id", ctx.organizationId);
  if (error) throw new Error(error.message);
  for (const v of variants) {
    await ctx.supabase
      .from("ai_experiment_variants")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", v.id);
  }
  return (await getExperiment(ctx, experimentId))!;
}

export async function prepareExperiment(
  ctx: AssistantContext,
  experimentId: string
): Promise<{ experiment: ExperimentRecord; executionPlanId: string }> {
  const exp = await getExperiment(ctx, experimentId);
  if (!exp) throw new ExperimentValidationError("Experiment not found.");
  if (exp.status !== "approved") {
    throw new ExperimentValidationError("Experiment must be approved before preparation.");
  }
  const variants = exp.variants ?? [];
  const steps = variants.map((v) =>
    newStep({
      type: "create_content",
      title: `Experiment ${exp.name}: ${v.name}`,
      input: {
        instructions: v.description || v.name,
        experimentVariantId: v.id,
        experimentId: exp.id,
        platform: exp.platform,
      },
      requiresConfirmation: true,
    })
  );
  const plan = await insertExecutionPlan(ctx, {
    title: `Prepare experiment: ${exp.name}`,
    objective: exp.objective,
    growthBriefId: exp.growthBriefId,
    plan: {
      version: 1,
      rationale: exp.hypothesis,
      evidence: [`experimentId:${exp.id}`],
      steps,
    },
    status: "review",
  });

  const allocation: AllocationJson = {
    ...exp.allocation,
    executionPlanId: plan.id,
  };
  await ctx.supabase
    .from("ai_experiments")
    .update({
      allocation_json: allocation,
      updated_at: new Date().toISOString(),
    })
    .eq("id", experimentId);

  for (const v of variants) {
    await ctx.supabase
      .from("ai_experiment_variants")
      .update({
        execution_plan_id: plan.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", v.id);
  }

  return { experiment: (await getExperiment(ctx, experimentId))!, executionPlanId: plan.id };
}

export async function linkVariantAsset(
  ctx: AssistantContext,
  variantId: string,
  input: {
    contentId?: string | null;
    campaignId?: string | null;
    scheduledPostId?: string | null;
  }
): Promise<void> {
  const { data: variant } = await applyClientWorkspaceScope(
    ctx.supabase
      .from("ai_experiment_variants")
      .select("*")
      .eq("id", variantId)
      .eq("organization_id", ctx.organizationId),
    ctx.scope
  ).maybeSingle();
  if (!variant) throw new ExperimentValidationError("Variant not found.");

  if (input.contentId) {
    const check = await verifyContentInWorkspace(ctx, input.contentId);
    if (!check.ok) throw new ExperimentValidationError("Content not in workspace.");
  }

  await ctx.supabase
    .from("ai_experiment_variants")
    .update({
      content_id: input.contentId ?? null,
      campaign_id: input.campaignId ?? null,
      scheduled_post_id: input.scheduledPostId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", variantId);
}

export async function startExperiment(
  ctx: AssistantContext,
  experimentId: string
): Promise<ExperimentRecord> {
  const exp = await getExperiment(ctx, experimentId);
  if (!exp) throw new ExperimentValidationError("Experiment not found.");
  if (exp.status !== "approved") {
    throw new ExperimentValidationError("Only approved experiments can be started.");
  }
  const variants = exp.variants ?? [];
  if (allocationRequiresHundredPercent("running")) {
    validateFixedSplitAllocation(variants);
  }

  const { resolveExperimentContext, buildContextSnapshot } = await import(
    "./context-resolver"
  );
  const resolved = await resolveExperimentContext(ctx, exp, variants);
  const contextSnapshot = buildContextSnapshot(exp, variants, resolved);

  const now = new Date().toISOString();
  await ctx.supabase
    .from("ai_experiments")
    .update({
      status: "running",
      started_at: now,
      platform: resolved.platform ?? exp.platform,
      audience_context: resolved.audienceContext,
      platform_context: resolved.platformContext,
      content_context: resolved.contentContext,
      context_snapshot_json: contextSnapshot,
      updated_at: now,
    })
    .eq("id", experimentId);

  for (const v of variants) {
    let baseline = await captureWorkspaceBaseline(ctx, {
      windowDays: exp.minimumObservationDays,
      platform: exp.platform,
    });
    if (v.contentId) {
      baseline = await captureContentBaseline(ctx, v.contentId);
    }
    await ctx.supabase
      .from("ai_experiment_variants")
      .update({
        status: "active",
        baseline_json: baseline,
        updated_at: now,
      })
      .eq("id", v.id);

    await insertLearningOutcome(ctx, {
      idempotencyKey: `experiment:${experimentId}:variant:${v.id}`,
      objective: `${exp.objective} — ${v.name}`,
      sourceType: "content",
      sourceId: v.contentId,
      platform: exp.platform,
      contentId: v.contentId,
      baseline,
      windowDays: exp.minimumObservationDays,
      status: "pending",
      experimentId,
      experimentVariantId: v.id,
    });
  }

  return (await getExperiment(ctx, experimentId))!;
}

export async function getExperimentComparison(
  ctx: AssistantContext,
  experimentId: string
): Promise<import("./types").VariantComparisonResult> {
  const exp = await getExperiment(ctx, experimentId);
  if (!exp) throw new ExperimentValidationError("Experiment not found.");
  const { hasUsableMeasurementSnapshot, variantComparisonFromMeasurementSnapshot } =
    await import("@/lib/evaluation/experiment");
  if (hasUsableMeasurementSnapshot(exp.measurementSnapshot)) {
    return variantComparisonFromMeasurementSnapshot(exp.measurementSnapshot);
  }
  const variants = exp.variants ?? [];
  return compareVariants(exp, variants);
}

export async function measureRunningExperiment(
  ctx: AssistantContext,
  experimentId: string,
  options?: { interpret?: boolean; forceComplete?: boolean }
): Promise<ExperimentRecord> {
  const exp = await getExperiment(ctx, experimentId);
  if (!exp) throw new ExperimentValidationError("Experiment not found.");
  if (exp.status !== "running" && exp.status !== "paused") {
    throw new ExperimentValidationError("Experiment is not running.");
  }
  if (!exp.startedAt) throw new ExperimentValidationError("Experiment has no start time.");

  const { observationWindowElapsed, canForceExperimentMeasurement } = await import(
    "./test-mode"
  );
  if (!observationWindowElapsed(exp.startedAt, exp.minimumObservationDays)) {
    if (options?.forceComplete) {
      if (!canForceExperimentMeasurement()) {
        throw new ExperimentValidationError(
          "Forced measurement is only allowed in server test mode."
        );
      }
    } else {
      throw new ExperimentValidationError("Observation window has not elapsed.");
    }
  }

  const variants = exp.variants ?? [];
  for (const v of variants) {
    let outcome = await captureWorkspaceBaseline(ctx, {
      windowDays: exp.minimumObservationDays,
      platform: exp.platform,
    });
    if (v.contentId) {
      outcome = await captureContentBaseline(ctx, v.contentId);
    }
    await ctx.supabase
      .from("ai_experiment_variants")
      .update({
        outcome_json: outcome,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", v.id);

    const { data: learning } = await ctx.supabase
      .from("ai_learning_outcomes")
      .select("id")
      .eq("organization_id", ctx.organizationId)
      .eq("idempotency_key", `experiment:${experimentId}:variant:${v.id}`)
      .maybeSingle();
    if (learning?.id) {
      try {
        await measureLearningOutcome(ctx, learning.id, {
          interpret: false,
          skipWindowCheck: true,
        });
      } catch {
        /* best effort */
      }
    }
  }

  const loadedVariants = await loadVariants(ctx, experimentId);
  const comparison = compareVariants(exp, loadedVariants);
  const { evaluateDataQuality } = await import("./data-quality");
  const { validateExperimentAttribution } = await import("./attribution");
  const { buildMeasurementSnapshot, shouldPersistMeasurement } = await import(
    "./measurement-snapshot"
  );
  const { gateExperimentLearning } = await import("./learning-quality");

  const dataQuality = evaluateDataQuality(exp, loadedVariants);
  const attribution = validateExperimentAttribution(exp, loadedVariants);
  const { findLatestExecutedOptimizationForExperiment } = await import(
    "@/lib/optimization/execution-refs"
  );
  const optimizationRefs = await findLatestExecutedOptimizationForExperiment(
    ctx,
    experimentId
  );
  const measurementSnapshot = buildMeasurementSnapshot({
    experiment: exp,
    variants: loadedVariants,
    comparison,
    dataQuality,
    attribution,
    optimizationProposalId: optimizationRefs?.optimizationProposalId ?? null,
    optimizationExecutionId: optimizationRefs?.optimizationExecutionId ?? null,
  });
  const learningGate = gateExperimentLearning(dataQuality, attribution);

  if (learningGate.learningStatus === "insufficient_data") {
    const { data: learnings } = await ctx.supabase
      .from("ai_learning_outcomes")
      .select("id")
      .eq("organization_id", ctx.organizationId)
      .like("idempotency_key", `experiment:${experimentId}:variant:%`);
    for (const row of learnings ?? []) {
      await ctx.supabase
        .from("ai_learning_outcomes")
        .update({
          status: "insufficient_data",
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    }
  }

  const allocation: AllocationJson = {
    ...exp.allocation,
    lastComparison: comparison,
  };

  let interpretation = exp.interpretation;
  if (options?.interpret !== false) {
    try {
      await assertExperimentAiEntitlement(ctx);
      interpretation = await interpretExperimentWithAI({
        experiment: {
          name: exp.name,
          objective: exp.objective,
          hypothesis: exp.hypothesis,
        },
        comparison,
      });
      await recordUsageEvent(ctx.organizationId, "ai_generation");
    } catch {
      /* skip AI */
    }
  }

  const ended = new Date().toISOString();
  const persistMeasurement = shouldPersistMeasurement(
    exp.measurementSnapshot,
    measurementSnapshot
  );
  await ctx.supabase
    .from("ai_experiments")
    .update({
      status: "completed",
      ended_at: ended,
      allocation_json: allocation,
      interpretation_json: interpretation,
      measurement_snapshot_json: persistMeasurement ? measurementSnapshot : exp.measurementSnapshot,
      evidence_quality: dataQuality.status === "strong" ? "strong" : dataQuality.status === "comparable" ? "usable" : "limited",
      decision_notes: learningGate.reason.slice(0, 2000),
      updated_at: ended,
    })
    .eq("id", experimentId);

  try {
    const { runExperimentEvaluation } = await import("@/lib/evaluation/experiment-run");
    await runExperimentEvaluation(ctx, experimentId, {
      interpret: options?.interpret !== false,
    });
  } catch {
    /* evaluation must not block experiment completion */
  }

  const updated = (await getExperiment(ctx, experimentId))!;
  try {
    const { syncExperimentIntelligence } = await import("./intelligence");
    await syncExperimentIntelligence(ctx, experimentId, { runAi: options?.interpret !== false });
  } catch {
    /* intelligence sync must not block */
  }
  if (optimizationRefs?.optimizationProposalId) {
    try {
      const { syncOptimizationOutcome } = await import("@/lib/optimization/outcome");
      await syncOptimizationOutcome(ctx, optimizationRefs.optimizationProposalId, {
        force: options?.forceComplete,
      });
    } catch {
      /* outcome sync must not block experiment completion */
    }
  }
  return updated;
}
