import type {
  ContentGoal,
  ContentPlatform,
  ContentTone,
  ContentType,
} from "./types";

export const CONTENT_TYPES: { id: ContentType; label: string }[] = [
  { id: "social_post", label: "Social Post" },
  { id: "ad_creative", label: "Ad Creative" },
  { id: "carousel", label: "Carousel" },
  { id: "story", label: "Story" },
  { id: "reel", label: "Reel" },
];

export const CONTENT_GOALS: { id: ContentGoal; label: string }[] = [
  { id: "awareness", label: "Awareness" },
  { id: "engagement", label: "Engagement" },
  { id: "leads", label: "Leads" },
  { id: "sales", label: "Sales" },
  { id: "app_installs", label: "App installs" },
];

export const CONTENT_PLATFORMS: { id: ContentPlatform; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "linkedin", label: "LinkedIn" },
];

export const CONTENT_TONES: { id: ContentTone; label: string }[] = [
  { id: "professional", label: "Professional" },
  { id: "bold", label: "Bold" },
  { id: "educational", label: "Educational" },
  { id: "conversational", label: "Conversational" },
  { id: "premium", label: "Premium" },
];

export const CONTENT_TYPE_LABELS = Object.fromEntries(
  CONTENT_TYPES.map((t) => [t.id, t.label])
) as Record<ContentType, string>;

export const CONTENT_GOAL_LABELS = Object.fromEntries(
  CONTENT_GOALS.map((g) => [g.id, g.label])
) as Record<ContentGoal, string>;

export const CONTENT_PLATFORM_LABELS = Object.fromEntries(
  CONTENT_PLATFORMS.map((p) => [p.id, p.label])
) as Record<ContentPlatform, string>;

export const CONTENT_TONE_LABELS = Object.fromEntries(
  CONTENT_TONES.map((t) => [t.id, t.label])
) as Record<ContentTone, string>;
