export type ContentType =
  | "social_post"
  | "ad_creative"
  | "carousel"
  | "story"
  | "reel";

export type ContentGoal =
  | "awareness"
  | "engagement"
  | "leads"
  | "sales"
  | "app_installs";

export type ContentPlatform = "instagram" | "facebook" | "tiktok" | "linkedin";

export type ContentTone =
  | "professional"
  | "bold"
  | "educational"
  | "conversational"
  | "premium";

export type ContentStatus = "draft" | "ready" | "archived";

export interface CreativeBrief {
  contentType: ContentType;
  goal: ContentGoal;
  platform: ContentPlatform;
  audience: string;
  tone: ContentTone;
  topic: string;
  additionalContext: string;
  cta: string;
}

export interface GeneratedCreative {
  hook: string;
  headline: string;
  primaryCopy: string;
  cta: string;
  caption: string;
  hashtags: string[];
  creativeDirection: string;
}

export interface ContentDraft {
  id: string;
  userId: string;
  organizationId: string;
  brief: CreativeBrief;
  creative: GeneratedCreative;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContentDraftSummary {
  id: string;
  headline: string | null;
  platform: ContentPlatform;
  contentType: ContentType;
  status: ContentStatus;
  updatedAt: string;
}

export function defaultCreativeBrief(): CreativeBrief {
  return {
    contentType: "social_post",
    goal: "awareness",
    platform: "instagram",
    audience: "",
    tone: "professional",
    topic: "",
    additionalContext: "",
    cta: "",
  };
}

export function emptyGeneratedCreative(): GeneratedCreative {
  return {
    hook: "",
    headline: "",
    primaryCopy: "",
    cta: "",
    caption: "",
    hashtags: [],
    creativeDirection: "",
  };
}
