import {
  repurposeContentTool,
} from "@/lib/assistant/tools/content";
import { saveContentDraftFromAssistant } from "@/lib/assistant/content-persistence";
import type { AssistantContext } from "@/lib/assistant/types";
import type { ContentPlatform } from "@/lib/content/types";
import { recordExecutionAiGeneration } from "./usage";
import type { ExecutionPlanStep } from "./types";

export async function runRepurposeContentStep(
  ctx: AssistantContext,
  step: ExecutionPlanStep
): Promise<ExecutionPlanStep> {
  if (step.result?.contentIds?.length) {
    return { ...step, status: "ready" };
  }

  const sourceContentId = String(step.input.sourceContentId ?? "");
  const targetPlatforms = (step.input.targetPlatforms as ContentPlatform[]) ?? [
    "linkedin",
  ];

  if (!sourceContentId) {
    return {
      ...step,
      status: "failed",
      error: "No source content selected for repurposing.",
    };
  }

  const contentIds: string[] = [];
  const sourcePlatform = String(step.input.sourcePlatform ?? "");

  for (const target of targetPlatforms) {
    if (target === sourcePlatform) continue;
    const generated = await repurposeContentTool(ctx, {
      contentId: sourceContentId,
      targetPlatform: target,
    });
    if (generated && "error" in generated) {
      continue;
    }
    if (!generated || !("brief" in generated) || !("creative" in generated)) {
      continue;
    }
    const saved = await saveContentDraftFromAssistant(ctx, {
      brief: generated.brief,
      creative: generated.creative,
    });
    if ("contentId" in saved) {
      contentIds.push(saved.contentId);
      await recordExecutionAiGeneration(ctx);
    }
  }

  if (contentIds.length === 0) {
    return {
      ...step,
      status: "failed",
      error: "Unable to repurpose content — check source post and platforms.",
    };
  }

  return {
    ...step,
    status: "ready",
    result: {
      contentIds,
      message: `Repurposed into ${contentIds.length} draft(s).`,
    },
  };
}
