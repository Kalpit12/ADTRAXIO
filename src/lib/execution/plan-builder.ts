import type { GrowthBriefRecord, GrowthRecommendation } from "@/lib/agent/types";
import { getContentPerformance } from "@/lib/analytics/service";
import { getConnectedAccounts } from "@/lib/social/service";
import { loadBrandBrainContext } from "@/lib/assistant/brand-brain/loader";
import type { AssistantContext } from "@/lib/assistant/types";
import type { ContentPlatform } from "@/lib/content/types";
import { newStep } from "./plan-service";
import type { ExecutionPlanJson } from "./types";
import { PREPARABLE_ACTION_TYPES } from "./types";

const SUPPORTED_PLATFORMS: ContentPlatform[] = [
  "instagram",
  "facebook",
  "linkedin",
];

function pickPlatforms(connected: string[]): ContentPlatform[] {
  const picked = SUPPORTED_PLATFORMS.filter((p) => connected.includes(p));
  return picked.length > 0 ? picked : ["instagram"];
}

export function recommendationSupportsPrepare(rec: GrowthRecommendation): boolean {
  return PREPARABLE_ACTION_TYPES.has(rec.actionType);
}

export async function buildExecutionPlanFromInput(
  ctx: AssistantContext,
  input: {
    objective: string;
    growthBrief?: GrowthBriefRecord | null;
    recommendation?: GrowthRecommendation | null;
    recommendationIndex?: number;
    instructions?: string;
  }
): Promise<{ title: string; objective: string; plan: ExecutionPlanJson }> {
  const accounts = await getConnectedAccounts(
    ctx.supabase,
    ctx.organizationId,
    ctx.scope
  ).catch(() => []);
  const connected = accounts
    .filter((a) => a.status === "connected")
    .map((a) => a.platform);

  const brain = await loadBrandBrainContext(ctx, { mode: "strategy" });
  const evidence: string[] = [];
  if (input.growthBrief) {
    evidence.push(`Growth brief: ${input.growthBrief.summary.slice(0, 200)}`);
    for (const item of input.growthBrief.insights.slice(0, 3)) {
      evidence.push(item.title);
    }
  }
  if (input.recommendation) {
    evidence.push(...input.recommendation.evidence.slice(0, 5));
  }
  if (brain.profile?.goals?.length) {
    evidence.push(`Brand goal: ${brain.profile.goals[0]}`);
  }

  const platforms = pickPlatforms(connected);
  const tone =
    brain.profile?.tone?.toLowerCase() === "bold"
      ? "bold"
      : brain.profile?.brandVoice?.toLowerCase().includes("educational")
        ? "educational"
        : "professional";

  const topic =
    input.recommendation?.title ??
    input.objective.slice(0, 120) ??
    "Workspace growth initiative";

  const steps = [
    newStep({
      type: "analyze",
      title: "Analyze evidence",
      input: {
        growthBriefId: input.growthBrief?.id ?? null,
        recommendationIndex: input.recommendationIndex ?? null,
      },
      result: { message: "Evidence collected from brief, analytics, and Brand Brain." },
      requiresConfirmation: false,
      status: "completed",
    }),
  ];

  const actionType = input.recommendation?.actionType ?? "create_content";

  if (actionType === "repurpose_content") {
    const rows = await getContentPerformance(
      ctx.supabase,
      ctx.organizationId,
      { preset: "7d", scope: ctx.scope }
    ).catch(() => []);
    const top = [...rows].sort(
      (a, b) => (b.engagement ?? 0) - (a.engagement ?? 0)
    )[0];
    const sourceContentId = top?.id ?? null;
    const targetPlatforms = platforms.length > 1
      ? platforms.slice(0, 3)
      : ["instagram", "linkedin"].filter((p) => p !== top?.platform);

    steps.push(
      newStep({
        type: "repurpose_content",
        title: "Repurpose top-performing content",
        input: {
          sourceContentId,
          sourcePlatform: top?.platform ?? null,
          targetPlatforms,
        },
        requiresConfirmation: false,
        status: "pending",
      })
    );
  } else if (actionType === "create_content" || !input.recommendation) {
    const count = 3;
    steps.push(
      newStep({
        type: "create_content",
        title: `Create ${count} content drafts`,
        input: {
          count,
          topic,
          tone,
          platforms,
          audience: brain.profile?.targetAudience ?? "",
          instructions: input.instructions ?? "",
          goal: "engagement",
        },
        requiresConfirmation: false,
        status: "pending",
      })
    );
  }

  if (actionType === "review_campaign" || input.instructions?.includes("campaign")) {
    steps.push(
      newStep({
        type: "create_campaign",
        title: "Prepare campaign draft",
        input: {
          name: `${topic.slice(0, 60)} — Campaign`,
          objective: "engagement",
          description: input.recommendation?.reason ?? input.objective,
        },
        requiresConfirmation: true,
        status: "pending",
      })
    );
  }

  if (
    actionType === "create_content" ||
    actionType === "repurpose_content" ||
    actionType === "review_scheduled_posts"
  ) {
    steps.push(
      newStep({
        type: "prepare_schedule",
        title: "Prepare publishing schedule",
        input: {
          platforms,
          timezone: "UTC",
        },
        requiresConfirmation: true,
        status: "pending",
      })
    );
  }

  const title = input.recommendation?.title ?? input.objective.slice(0, 80);
  const rationale =
    input.recommendation?.reason ??
    `Execution plan for: ${input.objective}`;

  return {
    title,
    objective: input.objective,
    plan: {
      version: 1,
      rationale,
      evidence,
      source: {
        growthBriefId: input.growthBrief?.id,
        recommendationIndex: input.recommendationIndex,
        recommendationTitle: input.recommendation?.title,
      },
      steps,
    },
  };
}

export function planReviewUrl(planId: string): string {
  return `/assistant/execution/${planId}`;
}
