import { getContentPerformance } from "@/lib/analytics/service";
import { loadBrandBrainContext } from "@/lib/assistant/brand-brain/loader";
import type { AssistantContext } from "@/lib/assistant/types";
import type { ContentPlatform } from "@/lib/content/types";
import { newStep } from "@/lib/execution/plan-service";
import type { ExecutionPlanJson } from "@/lib/execution/types";
import type { StrategicAction, StrategicPlanRecord } from "./types";

const SUPPORTED_PLATFORMS: ContentPlatform[] = [
  "instagram",
  "facebook",
  "linkedin",
];

function pickPlatforms(connected: string[], preferred?: string | null): ContentPlatform[] {
  const pref = preferred?.toLowerCase();
  if (pref && SUPPORTED_PLATFORMS.includes(pref as ContentPlatform)) {
    return [pref as ContentPlatform];
  }
  const picked = SUPPORTED_PLATFORMS.filter((p) => connected.includes(p));
  return picked.length > 0 ? picked : ["instagram"];
}

export function strategicPlanReviewUrl(planId: string): string {
  return `/assistant/strategy/${planId}`;
}

export async function buildExecutionPlanFromStrategicPlan(
  ctx: AssistantContext,
  strategic: StrategicPlanRecord,
  approvedActions: StrategicAction[]
): Promise<{ title: string; objective: string; plan: ExecutionPlanJson }> {
  const brain = await loadBrandBrainContext(ctx, { mode: "strategy" });
  const tone =
    brain.profile?.tone?.toLowerCase() === "bold"
      ? "bold"
      : brain.profile?.brandVoice?.toLowerCase().includes("educational")
        ? "educational"
        : "professional";

  const performance = await getContentPerformance(ctx.supabase, ctx.organizationId, {
    preset: "30d",
    scope: ctx.scope,
  }).catch(() => []);
  const top = [...performance].sort(
    (a, b) => (b.engagement ?? 0) - (a.engagement ?? 0)
  )[0];

  const evidence = [
    strategic.plan.summary,
    ...strategic.evidence.slice(0, 6).map((e) => `${e.metric}: ${e.value} (${e.interpretation})`),
  ];

  const steps = [
    newStep({
      type: "analyze",
      title: "Review strategic evidence",
      input: { strategicPlanId: strategic.id },
      result: {
        message: "Strategic plan evidence reviewed before execution steps.",
      },
      requiresConfirmation: false,
      status: "completed",
    }),
  ];

  for (const action of approvedActions) {
    const platforms = pickPlatforms(
      strategic.evidence
        .find((e) => e.metric === "Connected platforms")
        ?.value.split(", ")
        .map((s) => s.trim()) ?? [],
      action.platform
    );

    if (action.type === "create_content") {
      const count = Number(action.input?.count ?? 2);
      steps.push(
        newStep({
          type: "create_content",
          title: action.title,
          input: {
            count: Math.min(Math.max(count, 1), 5),
            topic: action.target ?? strategic.objective.slice(0, 120),
            tone,
            platforms,
            audience: brain.profile?.targetAudience ?? "",
            instructions: action.instructions ?? action.reason,
            goal: "engagement",
            ...action.input,
          },
          requiresConfirmation: false,
          status: "pending",
        })
      );
    } else if (action.type === "repurpose_content") {
      steps.push(
        newStep({
          type: "repurpose_content",
          title: action.title,
          input: {
            sourceContentId:
              (action.input?.sourceContentId as string) ?? top?.id ?? null,
            sourcePlatform: top?.platform ?? null,
            targetPlatforms:
              (action.input?.targetPlatforms as string[]) ??
              platforms.filter((p) => p !== top?.platform).slice(0, 2),
            instructions: action.instructions ?? "",
          },
          requiresConfirmation: false,
          status: "pending",
        })
      );
    } else if (action.type === "create_campaign") {
      steps.push(
        newStep({
          type: "create_campaign",
          title: action.title,
          input: {
            name: String(action.input?.name ?? action.title).slice(0, 80),
            objective: (action.input?.objective as string) ?? "engagement",
            description: action.reason,
            ...action.input,
          },
          requiresConfirmation: true,
          status: "pending",
        })
      );
    } else if (action.type === "prepare_schedule") {
      steps.push(
        newStep({
          type: "prepare_schedule",
          title: action.title,
          input: {
            platforms,
            timezone: "UTC",
            instructions: action.instructions ?? "",
            ...action.input,
          },
          requiresConfirmation: true,
          status: "pending",
        })
      );
    } else if (action.type === "create_report") {
      steps.push(
        newStep({
          type: "create_report",
          title: action.title,
          input: {
            reportType: action.input?.reportType ?? "performance",
            period: action.input?.period ?? "30d",
            instructions: action.instructions ?? action.reason,
            ...action.input,
          },
          requiresConfirmation: true,
          status: "pending",
        })
      );
    }
  }

  return {
    title: `Strategic plan: ${strategic.objective.slice(0, 72)}`,
    objective: strategic.objective,
    plan: {
      version: 1,
      rationale: strategic.plan.summary,
      evidence,
      source: {
        growthBriefId: strategic.plan.growthBriefId ?? undefined,
        recommendationTitle: `Strategic plan ${strategic.id}`,
      },
      steps,
      auditLog: [],
    },
  };
}
