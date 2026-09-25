import type { StrategistContextBundle } from "./context";
import type { StrategyType } from "./types";

export function buildStrategistSystemPrompt(): string {
  return `You are ADTRAXIO AI Strategic Execution Planner.

CRITICAL:
- You PROPOSE plans only. You never execute, publish, schedule, or create campaigns directly.
- Use ONLY facts supplied in the user message. Never invent metrics, engagement rates, or posting times.
- Label reasoning as MEASURED (database metrics), OBSERVED (patterns in data), INTERPRETED (uncertain explanation), or RECOMMENDED (proposed action).
- Never present interpretation as measured fact.
- If evidence is limited, set confidence to low and say so.
- Action types MUST be one of: create_content, repurpose_content, create_campaign, prepare_schedule, create_report.
- Do not invent product claims; use Brand Brain approved claims only.
- Return strict JSON matching the requested schema.

ADAPTIVE STRATEGY:
- Answer: What is happening now? What have we learned previously? Which learnings are relevant? Should they influence this plan? How or why not?
- Label CURRENT period metrics separately from HISTORICAL LEARNING and STRATEGY EVALUATION. Never present historical learning or past strategy evaluations as current performance.
- Strategy evaluations describe how past strategies performed vs objectives — correlation, not causation. Do not treat them as winners or rankings.
- Completed experiments are historical evidence only. Do not auto-optimize from a single experiment.
- EXPERIMENT EVALUATIONS describe normalized measurement outcomes — separate from intelligence summaries and from current performance.
- CROSS-EXPERIMENT EVIDENCE aggregates historical observations — never treat as universal rules or winners.
- OPTIMIZATION: You may reference optimizationOpportunity objects only (review). Never output executeOptimization or automatic changes.
- OPTIMIZATION OUTCOMES describe measured post-execution observations — separate from current performance and validated learning. Never treat outcomes as proof the optimization worked or as automatic future allocation.
- If historical learnings conflict, state mixed evidence — do not fabricate a winner.
- If no validated learnings were provided, say strategy is based primarily on current evidence.
- Reference learningId values only from the provided historical learnings list.`;
}

export function buildStrategistUserPrompt(
  bundle: StrategistContextBundle,
  input: {
    objective: string;
    strategyType?: StrategyType;
    instructions?: string;
    includeAlternatives?: boolean;
  }
): string {
  const factsPayload = {
    objective: input.objective,
    strategyType: input.strategyType ?? "custom",
    instructions: input.instructions ?? null,
    period: bundle.facts.periodLabel,
    metricChanges: bundle.facts.metricChanges,
    topContent: bundle.topContent,
    contentPatterns: bundle.facts.contentPatterns,
    failedPosts: bundle.facts.failedPosts,
    intelligenceRecommendations: bundle.intelligenceRecommendations,
    growthBrief: bundle.growthBrief
      ? {
          summary: bundle.growthBrief.summary,
          insights: bundle.growthBrief.insights.slice(0, 5),
          recommendations: bundle.growthBrief.recommendations.slice(0, 5),
        }
      : null,
    connectedPlatforms: bundle.connectedPlatforms,
    campaignCount: bundle.campaignCount,
    scheduledUpcoming: bundle.scheduledUpcoming,
    dataGaps: bundle.dataGaps,
    brandBrain: bundle.brandBrainPrompt,
    currentPeriodEvidence: {
      period: bundle.facts.periodLabel,
      metricChanges: bundle.facts.metricChanges,
      topContent: bundle.topContent,
    },
    historicalValidatedLearnings: bundle.historicalLearningsPrompt,
    mixedHistoricalEvidence: bundle.mixedHistoricalEvidence,
    strategyEvaluationsHistorical: bundle.strategyEvaluationsPrompt,
    experimentEvidenceHistorical: bundle.experimentEvidencePrompt,
    experimentEvaluationsHistorical: bundle.experimentEvaluationsPrompt,
    crossExperimentEvidenceHistorical: bundle.crossExperimentEvidencePrompt,
    crossExperimentLearningsHistorical: bundle.crossExperimentLearningsPrompt,
    optimizationOutcomesHistorical: bundle.optimizationOutcomesPrompt,
  };

  const altBlock = input.includeAlternatives
    ? `
Optionally include up to 3 alternatives when useful (Conservative, Growth, Campaign-style).
Each alternative must cite the same real evidence — do not fabricate.
If one approach is clearly sufficient, omit alternatives.`
    : `Do not include alternatives unless explicitly useful; prefer a single focused plan.`;

  return `Create a strategic execution plan for this workspace.

Facts JSON (use only this data):
${JSON.stringify(factsPayload, null, 2)}

${altBlock}

Return JSON:
{
  "objective": string,
  "summary": string,
  "strategyType": "content_growth|engagement_recovery|audience_growth|campaign_push|consistency|performance_optimization|custom",
  "confidence": "high|medium|low",
  "evidence": [{ "metric", "value", "period", "source", "interpretation": "measured|observed|interpreted|recommended" }],
  "insights": [{ "kind": "measured|observed|interpreted|recommended", "title", "body" }],
  "actions": [{
    "title", "reason", "evidence": [strings], "priority": "high|medium|low",
    "confidence": "high|medium|low", "type": "create_content|repurpose_content|create_campaign|prepare_schedule|create_report",
    "platform", "target", "instructions", "input": {}
  }],
  "alternatives": [{ "label", "summary", "actions": [...] }],
  "currentSituation": "CURRENT period summary only",
  "historicalEvidence": [{ "learningId", "summary", "recency", "sampleContext" }],
  "adaptations": [{
    "learningId", "learning", "relevance", "application",
    "confidence": "high|medium|low",
    "adaptationType": "content_type|platform|content_pillar|tone|publishing_frequency|campaign_structure|repurposing|audience_angle"
  }],
  "mixedEvidenceNote": "optional when learnings conflict"
}`;
}
