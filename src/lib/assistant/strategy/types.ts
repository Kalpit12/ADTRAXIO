export type StrategyPlanStatus = "draft" | "active" | "archived";

export interface StrategyPlanPillar {
  name: string;
  reason: string;
}

export interface StrategyContentIdea {
  title: string;
  platform: string;
  pillar: string;
  description?: string;
}

export interface StrategyPlanJson {
  objective: string;
  audience: string | null;
  platforms: string[];
  contentPillars: StrategyPlanPillar[];
  cadence: string;
  durationDays: number;
  platformStrategy: string;
  contentIdeas: StrategyContentIdea[];
  reasoning: string;
}

export interface StrategyPlanRecord {
  id: string;
  organizationId: string;
  clientWorkspaceId: string | null;
  createdBy: string;
  title: string;
  objective: string;
  audience: string | null;
  platforms: string[];
  contentPillars: StrategyPlanPillar[];
  cadence: string | null;
  durationDays: number;
  planJson: StrategyPlanJson;
  status: StrategyPlanStatus;
  createdAt: string;
  updatedAt: string;
}
