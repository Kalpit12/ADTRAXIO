export type MemoryCategory =
  | "preference"
  | "brand"
  | "audience"
  | "strategy"
  | "content"
  | "product";

export type MemoryStatus = "active" | "archived";

export type MemorySource = "explicit" | "user_confirmed";

export interface BrandProfileRecord {
  id: string;
  organizationId: string;
  clientWorkspaceId: string | null;
  businessName: string | null;
  industry: string | null;
  description: string | null;
  targetAudience: string | null;
  brandVoice: string | null;
  tone: string | null;
  contentPillars: string[];
  preferredPlatforms: string[];
  preferredCtas: string[];
  keywords: string[];
  avoidWords: string[];
  brandRules: string[];
  goals: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BrandProductRecord {
  id: string;
  organizationId: string;
  clientWorkspaceId: string | null;
  name: string;
  description: string | null;
  audience: string | null;
  keyBenefits: string[];
  differentiators: string[];
  approvedClaims: string[];
  prohibitedClaims: string[];
  websiteUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrandMemoryRecord {
  id: string;
  organizationId: string;
  clientWorkspaceId: string | null;
  category: MemoryCategory;
  key: string;
  value: string;
  source: MemorySource;
  confidence: string | null;
  status: MemoryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BrandBrainContext {
  profile: BrandProfileRecord | null;
  products: BrandProductRecord[];
  memories: BrandMemoryRecord[];
  product?: BrandProductRecord | null;
}
