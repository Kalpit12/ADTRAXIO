import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceScope } from "@/lib/workspaces/scope";
import { LEGACY_WORKSPACE_SCOPE } from "@/lib/workspaces/scope";
import { buildIntelligenceAnalysis } from "./analysis";
import { generateIntelligenceWithAI, IntelligenceAIError } from "./openai";
import {
  getDashboardRecommendations,
  getLatestOverview,
  listRecommendations,
  saveGenerationResults,
  updateRecommendationStatus,
} from "./recommendations";
import type {
  GenerateIntelligenceResult,
  IntelligenceAnalysisContext,
  IntelligenceOverview,
  IntelligenceRecord,
  RecommendationStatus,
} from "./types";
import { IntelligenceValidationError, validateRecommendationStatus } from "./validation";

export class InsufficientDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientDataError";
  }
}

export async function generateIntelligence(
  supabase: SupabaseClient,
  organizationId: string,
  options?: {
    campaignId?: string | null;
    preset?: "7d" | "30d" | "90d";
    scope?: WorkspaceScope;
  }
): Promise<GenerateIntelligenceResult> {
  const scope = options?.scope ?? LEGACY_WORKSPACE_SCOPE;
  const analysisContext = await buildIntelligenceAnalysis(
    supabase,
    organizationId,
    { ...options, scope }
  );

  if (analysisContext.dataAvailability.connectedAccounts === 0) {
    throw new InsufficientDataError(
      "Connect a social account to generate growth insights."
    );
  }

  if (!analysisContext.dataAvailability.hasAnalytics) {
    throw new InsufficientDataError(
      "Publish content and collect performance data before generating insights."
    );
  }

  if (!analysisContext.dataAvailability.sufficientForInsights) {
    throw new InsufficientDataError(
      "There's not enough historical data to make a reliable recommendation yet."
    );
  }

  const aiOutput = await generateIntelligenceWithAI(analysisContext);
  const generatedAt = new Date().toISOString();

  await saveGenerationResults(
    supabase,
    organizationId,
    scope,
    analysisContext,
    aiOutput,
    generatedAt
  );

  const overview = await getLatestOverview(supabase, organizationId, scope, {
    campaignId: options?.campaignId ?? null,
  });

  return {
    overview: {
      ...overview,
      dataAvailability: analysisContext.dataAvailability,
      platformsAnalyzed: analysisContext.platforms,
      campaignsAnalyzed: analysisContext.campaigns.length,
    },
    analysisContext,
  };
}

export {
  buildIntelligenceAnalysis,
  getLatestOverview,
  listRecommendations,
  getDashboardRecommendations,
  updateRecommendationStatus,
  IntelligenceAIError,
  IntelligenceValidationError,
  validateRecommendationStatus,
};

export type {
  IntelligenceAnalysisContext,
  IntelligenceOverview,
  IntelligenceRecord,
  RecommendationStatus,
};
