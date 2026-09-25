import type { IntelligenceAnalysisContext } from "./types";

function compactContext(context: IntelligenceAnalysisContext): Record<string, unknown> {
  return {
    scope: context.scope,
    campaignName: context.campaignName,
    period: context.period,
    previousPeriod: context.previousPeriod,
    platforms: context.platforms,
    dataAvailability: context.dataAvailability,
    summary: context.summary,
    changes: context.changes.filter((c) => c.current != null || c.previous != null),
    topContent: context.topContent,
    underperformingContent: context.underperformingContent,
    platformComparison: context.platformComparison,
    campaigns: context.campaigns,
    contentPatterns: context.contentPatterns,
    publishingPatterns: context.publishingPatterns,
    timingPatterns: context.timingPatterns,
  };
}

export function buildIntelligencePrompt(context: IntelligenceAnalysisContext): string {
  const data = compactContext(context);

  return `You are a growth intelligence analyst for an organic social media workspace.

Analyze ONLY the structured data below. Do not invent metrics, trends, audience behavior, causes, conversions, or forecasts.

Rules:
- Distinguish Observed (what data shows), Interpretation (what may explain it), and Recommendation (what to test).
- Never present interpretation as proven fact. Do not claim causation from correlation.
- Do not give generic advice (hashtags, be consistent, engage audience, best time to post) unless this specific dataset supports it.
- If data is insufficient, say "Not enough data to generate a reliable insight yet." for that area.
- Recommendations must cite evidence from the provided data.
- Use cautious language: "may", "could", "consider testing".
- For content/tone patterns, say "in this dataset" not "causes".
- Do not recommend timing unless timingPatterns.sufficient is true.

Respond with JSON only in this exact shape:
{
  "summary": "2-3 sentence overview of what the data shows",
  "insights": [
    {
      "title": "short title",
      "observation": "what changed or what pattern is visible",
      "evidence": ["specific data point 1", "specific data point 2"],
      "confidence": "high|medium|low",
      "type": "growth|content|platform|campaign|timing"
    }
  ],
  "recommendations": [
    {
      "title": "short title",
      "action": "specific action to consider",
      "reason": "why based on data",
      "evidence": ["specific data point"],
      "priority": "high|medium|low",
      "type": "growth|content|platform|campaign|timing"
    }
  ]
}

Limit to at most 4 insights and 4 recommendations. Skip areas with insufficient evidence.

DATA:
${JSON.stringify(data, null, 2)}`;
}
