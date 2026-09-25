import type { AccountType, OnboardingGoal, SocialPlatform } from "./types";

export const ACCOUNT_TYPES: {
  id: AccountType;
  title: string;
  description: string;
}[] = [
  {
    id: "creator",
    title: "Creator",
    description: "I create content and grow my personal brand.",
  },
  {
    id: "business",
    title: "Business",
    description: "I use social media to grow my business.",
  },
  {
    id: "agency",
    title: "Agency",
    description: "I manage social media for clients.",
  },
];

export const ONBOARDING_GOALS: { id: OnboardingGoal; label: string }[] = [
  { id: "grow_audience", label: "Grow my audience" },
  { id: "generate_leads", label: "Generate leads" },
  { id: "increase_sales", label: "Increase sales" },
  { id: "brand_awareness", label: "Build brand awareness" },
  { id: "improve_engagement", label: "Improve engagement" },
  { id: "paid_campaigns", label: "Run paid campaigns" },
  { id: "manage_clients", label: "Manage clients" },
];

export const SOCIAL_PLATFORMS: { id: SocialPlatform; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "youtube", label: "YouTube" },
];

export const PROGRESS_STEPS = [
  { id: 1, label: "Profile" },
  { id: 2, label: "Goals" },
  { id: 3, label: "Details" },
  { id: 4, label: "Platforms" },
  { id: 5, label: "Ready" },
] as const;

export const GOAL_LABELS = Object.fromEntries(
  ONBOARDING_GOALS.map((g) => [g.id, g.label])
) as Record<OnboardingGoal, string>;

export const PLATFORM_LABELS = Object.fromEntries(
  SOCIAL_PLATFORMS.map((p) => [p.id, p.label])
) as Record<SocialPlatform, string>;

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  creator: "Creator",
  business: "Business",
  agency: "Agency",
};
