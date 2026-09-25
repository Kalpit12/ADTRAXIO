import { checkLimit } from "@/lib/billing/entitlements";
import { EntitlementError } from "@/lib/billing/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExecutionPlanStep } from "./types";

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

async function countMetric(
  supabase: SupabaseClient,
  organizationId: string,
  metric: "scheduled_posts" | "campaigns"
): Promise<number> {
  const monthStart = monthStartIso();
  if (metric === "scheduled_posts") {
    const { count } = await supabase
      .from("scheduled_posts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", ["scheduled", "published"])
      .gte("created_at", monthStart);
    return count ?? 0;
  }
  const { count } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .neq("status", "archived");
  return count ?? 0;
}

export async function assertPrepareEntitlements(
  supabase: SupabaseClient,
  organizationId: string,
  steps: ExecutionPlanStep[]
): Promise<void> {
  let newGenerations = 0;
  for (const step of steps) {
    if (
      (step.type === "create_content" || step.type === "repurpose_content") &&
      step.status === "pending"
    ) {
      if (step.type === "create_content") {
        newGenerations += Number(step.input.count ?? 1);
      } else {
        const platforms = (step.input.targetPlatforms as string[]) ?? [];
        newGenerations += Math.max(platforms.length, 1);
      }
    }
  }
  if (newGenerations > 0) {
    const { count } = await supabase
      .from("billing_usage_events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("metric", "ai_generation")
      .gte("created_at", monthStartIso());
    await checkLimit(
      supabase,
      organizationId,
      "ai_generation",
      (count ?? 0) + newGenerations - 1
    );
  }
}

export async function assertExecuteEntitlements(
  supabase: SupabaseClient,
  organizationId: string,
  steps: ExecutionPlanStep[]
): Promise<void> {
  let newSchedules = 0;
  let newCampaigns = 0;

  for (const step of steps) {
    if (!step.approved && step.requiresConfirmation) continue;
    if (step.status === "completed") continue;

    if (step.type === "prepare_schedule" && step.approved) {
      const items = step.result?.scheduleItems ?? [];
      newSchedules += items.filter((i) => !i.scheduledPostId).length;
    }
    if (
      step.type === "create_campaign" &&
      step.approved &&
      !step.result?.campaignId
    ) {
      newCampaigns += 1;
    }
  }

  if (newSchedules > 0) {
    const used = await countMetric(supabase, organizationId, "scheduled_posts");
    await checkLimit(
      supabase,
      organizationId,
      "scheduled_posts",
      used + newSchedules - 1
    );
  }

  if (newCampaigns > 0) {
    const used = await countMetric(supabase, organizationId, "campaigns");
    await checkLimit(
      supabase,
      organizationId,
      "campaigns",
      used + newCampaigns - 1
    );
  }
}

export function entitlementErrorMessage(error: unknown): string {
  if (error instanceof EntitlementError) return error.message;
  return error instanceof Error ? error.message : "Entitlement check failed.";
}
