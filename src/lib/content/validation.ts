import {
  CONTENT_GOALS,
  CONTENT_PLATFORMS,
  CONTENT_TONES,
  CONTENT_TYPES,
} from "./constants";
import type { CreativeBrief, GeneratedCreative } from "./types";

const CONTENT_TYPE_IDS = new Set(CONTENT_TYPES.map((t) => t.id));
const GOAL_IDS = new Set(CONTENT_GOALS.map((g) => g.id));
const PLATFORM_IDS = new Set(CONTENT_PLATFORMS.map((p) => p.id));
const TONE_IDS = new Set(CONTENT_TONES.map((t) => t.id));

export function validateCreativeBrief(
  brief: CreativeBrief
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!brief.topic.trim()) {
    errors.topic = "Topic or offer is required.";
  } else if (brief.topic.trim().length < 10) {
    errors.topic = "Add a bit more detail about what you're promoting.";
  }

  if (!brief.audience.trim()) {
    errors.audience = "Describe your target audience.";
  }

  return errors;
}

export function isValidBriefForGeneration(brief: CreativeBrief): boolean {
  return Object.keys(validateCreativeBrief(brief)).length === 0;
}

export function parseGenerateRequestBody(
  body: unknown
): { brief: CreativeBrief; variationOf?: GeneratedCreative } | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body." };
  }

  const raw = body as Record<string, unknown>;
  const briefRaw = raw.brief;

  if (!briefRaw || typeof briefRaw !== "object") {
    return { error: "Brief is required." };
  }

  const b = briefRaw as Record<string, unknown>;

  const contentType = String(b.contentType ?? "");
  const goal = String(b.goal ?? "");
  const platform = String(b.platform ?? "");
  const tone = String(b.tone ?? "");

  if (!CONTENT_TYPE_IDS.has(contentType as CreativeBrief["contentType"])) {
    return { error: "Invalid content type." };
  }
  if (!GOAL_IDS.has(goal as CreativeBrief["goal"])) {
    return { error: "Invalid goal." };
  }
  if (!PLATFORM_IDS.has(platform as CreativeBrief["platform"])) {
    return { error: "Invalid platform." };
  }
  if (!TONE_IDS.has(tone as CreativeBrief["tone"])) {
    return { error: "Invalid tone." };
  }

  const brief: CreativeBrief = {
    contentType: contentType as CreativeBrief["contentType"],
    goal: goal as CreativeBrief["goal"],
    platform: platform as CreativeBrief["platform"],
    audience: String(b.audience ?? "").slice(0, 500),
    tone: tone as CreativeBrief["tone"],
    topic: String(b.topic ?? "").slice(0, 4000),
    additionalContext: String(b.additionalContext ?? "").slice(0, 4000),
    cta: String(b.cta ?? "").slice(0, 200),
  };

  const briefErrors = validateCreativeBrief(brief);
  if (Object.keys(briefErrors).length > 0) {
    return { error: Object.values(briefErrors)[0] };
  }

  let variationOf: GeneratedCreative | undefined;
  if (raw.variationOf && typeof raw.variationOf === "object") {
    const v = raw.variationOf as Record<string, unknown>;
    variationOf = {
      hook: String(v.hook ?? ""),
      headline: String(v.headline ?? ""),
      primaryCopy: String(v.primaryCopy ?? ""),
      cta: String(v.cta ?? ""),
      caption: String(v.caption ?? ""),
      hashtags: Array.isArray(v.hashtags)
        ? v.hashtags.map((h) => String(h)).slice(0, 30)
        : [],
      creativeDirection: String(v.creativeDirection ?? ""),
    };
  }

  return { brief, variationOf };
}

export function validateGeneratedCreative(
  data: unknown
): GeneratedCreative | null {
  if (!data || typeof data !== "object") return null;

  const raw = data as Record<string, unknown>;

  const hook = String(raw.hook ?? "").trim();
  const headline = String(raw.headline ?? "").trim();
  const primaryCopy = String(raw.primaryCopy ?? raw.primary_copy ?? "").trim();
  const cta = String(raw.cta ?? "").trim();
  const caption = String(raw.caption ?? "").trim();
  const creativeDirection = String(
    raw.creativeDirection ?? raw.creative_direction ?? ""
  ).trim();

  if (!hook || !headline || !primaryCopy || !caption) {
    return null;
  }

  let hashtags: string[] = [];
  if (Array.isArray(raw.hashtags)) {
    hashtags = raw.hashtags
      .map((tag) => String(tag).trim().replace(/^#/, ""))
      .filter(Boolean)
      .slice(0, 30);
  } else if (typeof raw.hashtags === "string") {
    hashtags = raw.hashtags
      .split(/[\s,]+/)
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter(Boolean)
      .slice(0, 30);
  }

  return {
    hook,
    headline,
    primaryCopy,
    cta: cta || "Learn more",
    caption,
    hashtags,
    creativeDirection,
  };
}

export function hashtagsToText(hashtags: string[]): string {
  return hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ");
}

export function parseHashtagsText(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);
}
