import { recordUsageEvent } from "@/lib/billing/service";
import type { AssistantContext } from "@/lib/assistant/types";

/** Record one successful AI generation against org billing (after draft saved). */
export async function recordExecutionAiGeneration(
  ctx: AssistantContext
): Promise<void> {
  await recordUsageEvent(ctx.organizationId, "ai_generation");
}
