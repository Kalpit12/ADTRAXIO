import {
  CONTENT_GOAL_LABELS,
  CONTENT_PLATFORM_LABELS,
  CONTENT_TONE_LABELS,
  CONTENT_TYPE_LABELS,
} from "@/lib/content/constants";
import type { CreativeBrief } from "@/lib/content/types";

export function buildCreativeConceptPrompt(brief: CreativeBrief): string {
  const contentType = CONTENT_TYPE_LABELS[brief.contentType];
  const goal = CONTENT_GOAL_LABELS[brief.goal];
  const platform = CONTENT_PLATFORM_LABELS[brief.platform];
  const tone = CONTENT_TONE_LABELS[brief.tone];

  return [
    "You are a senior creative strategist in ADTRAXIO.",
    "Produce a structured creative concept for a marketer to review and edit.",
    "Do not invent statistics, performance predictions, or guarantees.",
    "Do not claim the creative will outperform anything.",
    "",
    "Return valid JSON with exactly these keys:",
    "creativeAngle, hook, headline, primaryCopy, cta, caption, hashtags,",
    "visualDirection, voiceoverDirection, soundDirection, suggestedMedia",
    "",
    "suggestedMedia must be an array containing zero or more of:",
    '"image", "video", "voice", "sound"',
    "Choose only media that fits the brief. Do not include every type by default.",
    "",
    "Brief:",
    `- Content type: ${contentType}`,
    `- Goal: ${goal}`,
    `- Platform: ${platform}`,
    `- Audience: ${brief.audience}`,
    `- Tone: ${tone}`,
    `- Topic / offer: ${brief.topic}`,
    brief.additionalContext.trim()
      ? `- Additional context: ${brief.additionalContext}`
      : "",
    brief.cta.trim() ? `- Preferred CTA: ${brief.cta}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
