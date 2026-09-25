import { generateContentWithAI } from "@/lib/ai/generate-content";
import type { CreativeBrief } from "@/lib/content/types";
import { saveContentDraftFromAssistant } from "../content-persistence";
import { ensureOperationalScope } from "../permissions";
import { isValidUuid } from "../resource-scope";
import { getCompactBrandPrompt } from "../brand-brain/loader";
import { generateStrategyPlanJson } from "../strategy/generate-plan";
import {
  getStrategyPlanById,
  insertStrategyPlan,
  updateStrategyPlanRow,
} from "../strategy/service";
import type { StrategyPlanJson } from "../strategy/types";
import type { AssistantContext } from "../types";
import { getAnalyticsOverviewTool, getTopContentTool } from "./analytics";
import { getRecommendationsTool } from "./intelligence";

export async function createStrategyPlanTool(
  ctx: AssistantContext,
  args: {
    objective: string;
    durationDays?: number;
    platforms?: string[];
    audience?: string;
    focus?: string;
  }
) {
  ensureOperationalScope(ctx.scope);
  const objective = args.objective?.trim();
  if (!objective) return { error: "objective is required." };

  const durationDays = Math.min(Math.max(args.durationDays ?? 30, 7), 90);
  const platforms = Array.isArray(args.platforms)
    ? args.platforms.filter((p) => typeof p === "string")
    : [];

  const [analytics, topContent, recommendations] = await Promise.all([
    getAnalyticsOverviewTool(ctx, { dateRange: "30d" }).catch(() => null),
    getTopContentTool(ctx, { dateRange: "30d", limit: 5 }).catch(() => []),
    getRecommendationsTool(ctx).catch(() => []),
  ]);

  const brandBrain = await getCompactBrandPrompt(ctx, { mode: "strategy" });
  const planJson = await generateStrategyPlanJson({
    objective,
    durationDays,
    platforms,
    audience: args.audience?.trim() || null,
    focus: args.focus?.trim() || null,
    evidence: {
      analytics,
      topContent,
      recommendations,
      brandBrain,
    },
  });

  const title = `${durationDays}-Day Strategy`;
  const record = await insertStrategyPlan(ctx, {
    title,
    objective: planJson.objective,
    audience: planJson.audience,
    platforms: planJson.platforms,
    contentPillars: planJson.contentPillars,
    cadence: planJson.cadence,
    durationDays: planJson.durationDays,
    planJson,
  });

  return {
    planId: record.id,
    status: record.status,
    title: record.title,
    plan: planJson,
    message: "Strategy draft created.",
  };
}

export async function getStrategyPlanTool(
  ctx: AssistantContext,
  args: { planId: string }
) {
  ensureOperationalScope(ctx.scope);
  const planId = args.planId?.trim() ?? "";
  if (!isValidUuid(planId)) return { error: "Invalid planId." };

  const plan = await getStrategyPlanById(ctx, planId);
  if (!plan) return { error: "Strategy plan not found." };
  return plan;
}

export async function updateStrategyPlanTool(
  ctx: AssistantContext,
  args: {
    planId: string;
    title?: string;
    objective?: string;
    audience?: string;
    platforms?: string[];
    cadence?: string;
    durationDays?: number;
    contentPillars?: StrategyPlanJson["contentPillars"];
    planJson?: StrategyPlanJson;
    status?: "draft" | "active" | "archived";
  }
) {
  ensureOperationalScope(ctx.scope);
  const planId = args.planId?.trim() ?? "";
  if (!isValidUuid(planId)) return { error: "Invalid planId." };

  const updated = await updateStrategyPlanRow(ctx, planId, {
    title: args.title,
    objective: args.objective,
    audience: args.audience,
    platforms: args.platforms,
    cadence: args.cadence,
    durationDays: args.durationDays,
    contentPillars: args.contentPillars,
    planJson: args.planJson,
    status: args.status,
  });

  if (!updated) return { error: "Strategy plan not found." };
  return { planId: updated.id, plan: updated, message: "Strategy plan updated." };
}

export async function createContentFromPlanTool(
  ctx: AssistantContext,
  args: { planId: string; count?: number; ideaIndices?: number[] }
) {
  ensureOperationalScope(ctx.scope);
  const plan = await getStrategyPlanById(ctx, args.planId?.trim() ?? "");
  if (!plan) return { error: "Strategy plan not found." };

  const ideas = plan.planJson.contentIdeas ?? [];
  if (ideas.length === 0) {
    return { error: "This plan has no content ideas to generate." };
  }

  const count = Math.min(Math.max(args.count ?? 1, 1), 5);
  let selected = ideas.slice(0, count);

  if (args.ideaIndices?.length) {
    selected = args.ideaIndices
      .map((i) => ideas[i])
      .filter(Boolean)
      .slice(0, count);
  }

  const contentIds: string[] = [];
  const drafts: Array<{ contentId: string; title: string; platform: string }> =
    [];

  for (const idea of selected) {
    const { enrichBriefWithBrandBrain } = await import("./brand-brain");
    let brief: CreativeBrief = {
      contentType: "social_post",
      goal: "engagement",
      platform: (idea.platform as CreativeBrief["platform"]) ?? "instagram",
      audience: plan.audience ?? plan.planJson.audience ?? "",
      tone: "professional",
      topic: idea.title,
      additionalContext: [
        idea.description ?? "",
        `Strategy pillar: ${idea.pillar}`,
        plan.planJson.reasoning,
      ]
        .filter(Boolean)
        .join("\n"),
      cta: "",
    };

    brief = await enrichBriefWithBrandBrain(ctx, brief);
    const creative = await generateContentWithAI(brief);
    const saved = await saveContentDraftFromAssistant(ctx, { brief, creative });
    if ("error" in saved) continue;
    contentIds.push(saved.contentId);
    drafts.push({
      contentId: saved.contentId,
      title: idea.title,
      platform: idea.platform,
    });
  }

  if (contentIds.length === 0) {
    return { error: "Unable to create content drafts from this plan." };
  }

  return {
    planId: plan.id,
    contentIds,
    drafts,
    count: contentIds.length,
    message: `${contentIds.length} draft(s) created.`,
  };
}
