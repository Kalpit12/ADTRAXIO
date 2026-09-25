import type { GrowthRecommendationActionType } from "./types";

/** Builds assistant deep-link prompts — never executes side effects. */
export function buildRecommendationPrompt(
  actionType: GrowthRecommendationActionType,
  options?: { detail?: string }
): string {
  const detail = options?.detail?.trim();
  switch (actionType) {
    case "create_content":
      return detail ??
        "Create the recommended content from my latest growth brief. Use Brand Brain and real product data only.";
    case "create_strategy":
      return detail ??
        "Create a strategy plan based on my latest growth brief insights.";
    case "review_campaign":
      return detail ??
        "Review my active campaigns using real campaign data and summarize what needs attention.";
    case "review_scheduled_posts":
      return detail ??
        "Review my scheduled and failed posts. Suggest fixes but do not publish without confirmation.";
    case "create_report":
      return detail ??
        "Prepare a report draft summarizing performance from my latest growth brief period.";
    case "repurpose_content":
      return detail ??
        "Repurpose my top-performing content for another platform using repurpose_content.";
    default:
      return detail ?? "Help me act on my latest growth brief.";
  }
}

export function assistantHrefForPrompt(prompt: string): string {
  const params = new URLSearchParams();
  params.set("prompt", prompt);
  params.set("send", "1");
  return `/assistant?${params.toString()}`;
}
