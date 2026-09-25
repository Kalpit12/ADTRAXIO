import type { AssistantContext } from "../types";
import type {
  StrategyPlanJson,
  StrategyPlanPillar,
  StrategyPlanRecord,
  StrategyPlanStatus,
} from "./types";
import { isValidUuid } from "../resource-scope";

const EMPTY_CLIENT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

function scopePlanQuery<
  T extends { is: (c: string, v: null) => T; eq: (c: string, v: string) => T },
>(query: T, ctx: AssistantContext): T {
  if (!ctx.isAgency) return query.is("client_workspace_id", null);
  if (ctx.clientWorkspaceId) {
    return query.eq("client_workspace_id", ctx.clientWorkspaceId);
  }
  return query.eq("client_workspace_id", EMPTY_CLIENT_WORKSPACE_ID);
}

type DbRow = {
  id: string;
  organization_id: string;
  client_workspace_id: string | null;
  created_by: string;
  title: string;
  objective: string;
  audience: string | null;
  platforms: string[] | null;
  content_pillars: unknown;
  cadence: string | null;
  duration_days: number;
  plan_json: unknown;
  status: string;
  created_at: string;
  updated_at: string;
};

function mapRow(row: DbRow): StrategyPlanRecord {
  const pillars = Array.isArray(row.content_pillars)
    ? (row.content_pillars as StrategyPlanPillar[])
    : [];
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientWorkspaceId: row.client_workspace_id,
    createdBy: row.created_by,
    title: row.title,
    objective: row.objective,
    audience: row.audience,
    platforms: row.platforms ?? [],
    contentPillars: pillars,
    cadence: row.cadence,
    durationDays: row.duration_days,
    planJson: (row.plan_json ?? {}) as StrategyPlanJson,
    status: row.status as StrategyPlanStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getStrategyPlanById(
  ctx: AssistantContext,
  planId: string
): Promise<StrategyPlanRecord | null> {
  if (!isValidUuid(planId)) return null;

  let query = ctx.supabase
    .from("strategy_plans")
    .select("*")
    .eq("id", planId)
    .eq("organization_id", ctx.organizationId);

  query = scopePlanQuery(query, ctx);
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return mapRow(data as DbRow);
}

export async function insertStrategyPlan(
  ctx: AssistantContext,
  input: {
    title: string;
    objective: string;
    audience: string | null;
    platforms: string[];
    contentPillars: StrategyPlanPillar[];
    cadence: string;
    durationDays: number;
    planJson: StrategyPlanJson;
  }
): Promise<StrategyPlanRecord> {
  const clientWorkspaceId = ctx.isAgency ? ctx.clientWorkspaceId : null;
  const now = new Date().toISOString();

  const { data, error } = await ctx.supabase
    .from("strategy_plans")
    .insert({
      organization_id: ctx.organizationId,
      client_workspace_id: clientWorkspaceId,
      created_by: ctx.user.id,
      title: input.title,
      objective: input.objective,
      audience: input.audience,
      platforms: input.platforms,
      content_pillars: input.contentPillars,
      cadence: input.cadence,
      duration_days: input.durationDays,
      plan_json: input.planJson,
      status: "draft",
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "42P01") {
      throw new Error(
        "Strategy plans are not set up yet. Apply migration 025_strategy_plans."
      );
    }
    throw new Error(error.message);
  }

  return mapRow(data as DbRow);
}

export async function updateStrategyPlanRow(
  ctx: AssistantContext,
  planId: string,
  patch: Partial<{
    title: string;
    objective: string;
    audience: string | null;
    platforms: string[];
    contentPillars: StrategyPlanPillar[];
    cadence: string;
    durationDays: number;
    planJson: StrategyPlanJson;
    status: StrategyPlanStatus;
  }>
): Promise<StrategyPlanRecord | null> {
  const existing = await getStrategyPlanById(ctx, planId);
  if (!existing) return null;

  const { data, error } = await ctx.supabase
    .from("strategy_plans")
    .update({
      title: patch.title ?? existing.title,
      objective: patch.objective ?? existing.objective,
      audience: patch.audience !== undefined ? patch.audience : existing.audience,
      platforms: patch.platforms ?? existing.platforms,
      content_pillars: patch.contentPillars ?? existing.contentPillars,
      cadence: patch.cadence ?? existing.cadence,
      duration_days: patch.durationDays ?? existing.durationDays,
      plan_json: patch.planJson ?? existing.planJson,
      status: patch.status ?? existing.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId)
    .eq("organization_id", ctx.organizationId)
    .select("*")
    .single();

  if (error || !data) return null;
  return mapRow(data as DbRow);
}
