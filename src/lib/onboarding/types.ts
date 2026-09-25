export type AccountType = "creator" | "business" | "agency";

export type OnboardingGoal =
  | "grow_audience"
  | "generate_leads"
  | "increase_sales"
  | "brand_awareness"
  | "improve_engagement"
  | "paid_campaigns"
  | "manage_clients";

export type SocialPlatform =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "linkedin"
  | "youtube";

export type OnboardingStepIndex = 0 | 1 | 2 | 3 | 4 | 5;

export interface OnboardingData {
  step: OnboardingStepIndex;
  accountType: AccountType | null;
  goals: OnboardingGoal[];
  profileName: string;
  industry: string;
  category: string;
  location: string;
  website: string;
  description: string;
  clientCount: string;
  industriesServed: string;
  platforms: SocialPlatform[];
  connectPlatformsLater: boolean;
  onboardingCompleted: boolean;
}

export const defaultOnboardingData = (): OnboardingData => ({
  step: 0,
  accountType: null,
  goals: [],
  profileName: "",
  industry: "",
  category: "",
  location: "",
  website: "",
  description: "",
  clientCount: "",
  industriesServed: "",
  platforms: [],
  connectPlatformsLater: false,
  onboardingCompleted: false,
});
