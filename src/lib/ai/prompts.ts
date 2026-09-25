import {
  CONTENT_GOAL_LABELS,
  CONTENT_PLATFORM_LABELS,
  CONTENT_TONE_LABELS,
  CONTENT_TYPE_LABELS,
} from "@/lib/content/constants";
import type { CreativeBrief, GeneratedCreative } from "@/lib/content/types";

export function buildGenerateContentPrompt(
  brief: CreativeBrief,
  options?: { variationOf?: GeneratedCreative }
): string {
  const contentType = CONTENT_TYPE_LABELS[brief.contentType];
  const goal = CONTENT_GOAL_LABELS[brief.goal];
  const platform = CONTENT_PLATFORM_LABELS[brief.platform];
  const tone = CONTENT_TONE_LABELS[brief.tone];

  const lines = [
    "You are an experienced social advertising copywriter working inside ADTRAXIO, a professional creative workspace.",
    "Write platform-ready advertising copy based ONLY on the brief below.",
    "Do not invent business facts, statistics, testimonials, awards, or offers that were not provided.",
    "If information is limited, write conservative copy without exaggerated claims.",
    "Keep copy concise, usable, and ready for review by a marketer.",
    "",
    "Return valid JSON with exactly these keys:",
    "hook, headline, primaryCopy, cta, caption, hashtags, creativeDirection",
    "",
    "Field guidance:",
    "- hook: attention-grabbing opening line",
    "- headline: short headline",
    "- primaryCopy: main advertising/social body copy",
    "- cta: recommended call to action",
    "- caption: platform-ready caption",
    "- hashtags: array of relevant hashtags without # prefix",
    "- creativeDirection: short text description of recommended visual direction (no image generation)",
    "",
    "Brief:",
    `- Content type: ${contentType}`,
    `- Goal: ${goal}`,
    `- Platform: ${platform}`,
    `- Audience: ${brief.audience}`,
    `- Tone: ${tone}`,
    `- Topic / offer: ${brief.topic}`,
  ];

  if (brief.additionalContext.trim()) {
    lines.push(`- Additional context: ${brief.additionalContext}`);
  }

  if (brief.cta.trim()) {
    lines.push(`- Preferred CTA (use or adapt): ${brief.cta}`);
  }

  if (options?.variationOf) {
    lines.push(
      "",
      "Create a meaningfully different variation of the previous creative.",
      "Keep the same brief constraints but change angle, hook, and phrasing.",
      "",
      "Previous version:",
      JSON.stringify(options.variationOf, null, 2)
    );
  }

  return lines.join("\n");
}
