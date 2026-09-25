import type { AgentAnalysisFacts, GrowthInsight, GrowthRecommendation } from "./types";
import { buildRecommendationPrompt } from "./actions";

export function buildDeterministicInsights(
  facts: AgentAnalysisFacts
): GrowthInsight[] {
  const insights: GrowthInsight[] = [];

  for (const change of facts.metricChanges) {
    if (!change.meaningful || change.changePercent == null) continue;
    const direction = change.changePercent > 0 ? "increased" : "decreased";
    const severity =
      Math.abs(change.changePercent) >= 20 ? "important" : "attention";
    insights.push({
      type: "performance_change",
      title: `${change.metric} ${direction} ${Math.abs(change.changePercent)}%`,
      observation: `${change.metric} ${direction} compared to the prior period.`,
      evidence: [
        `Current ${change.metric}: ${change.current ?? "n/a"}`,
        `Previous ${change.metric}: ${change.previous ?? "n/a"}`,
        `Change: ${change.changePercent}%`,
      ],
      severity,
      confidence: change.current != null && change.previous != null ? "high" : "medium",
    });
  }

  if (facts.failedPosts.length > 0) {
    insights.push({
      type: "publishing_issue",
      title: `${facts.failedPosts.length} scheduled post${facts.failedPosts.length === 1 ? "" : "s"} failed`,
      observation: "Publishing failures need review before they affect your calendar.",
      evidence: facts.failedPosts.slice(0, 3).map(
        (p) => `${p.platform}: ${p.error ?? "publish failed"}`
      ),
      severity: facts.failedPosts.length >= 2 ? "important" : "attention",
      confidence: "high",
    });
  }

  if (facts.contentPatterns.length > 0) {
    insights.push({
      type: "content_pattern",
      title: "Top content pattern",
      observation: facts.contentPatterns[0],
      evidence: facts.topContent.slice(0, 3).map(
        (c) =>
          `${c.platform}: ${c.headline?.slice(0, 80) ?? "Post"} (${c.engagement ?? 0} engagement)`
      ),
      severity: "info",
      confidence: facts.topContent.length >= 3 ? "medium" : "low",
    });
  }

  if (
    facts.scheduledUpcomingCount === 0 &&
    facts.hasSufficientData &&
    facts.dataGaps.length === 0
  ) {
    insights.push({
      type: "consistency_issue",
      title: "No posts scheduled for the next 7 days",
      observation: "Your publishing calendar has no upcoming scheduled posts.",
      evidence: ["Review drafts or schedule content to stay consistent."],
      severity: "attention",
      confidence: "high",
    });
  }

  for (const rec of facts.intelligenceRecommendations.slice(0, 2)) {
    insights.push({
      type: "recommendation",
      title: rec.title,
      observation: rec.observation ?? rec.title,
      evidence: ["From Growth Intelligence recommendations."],
      severity: "info",
      confidence: "medium",
    });
  }

  return insights;
}

export function buildDeterministicRecommendations(
  facts: AgentAnalysisFacts,
  insights: GrowthInsight[]
): GrowthRecommendation[] {
  const recommendations: GrowthRecommendation[] = [];

  const patternInsight = insights.find((i) => i.type === "content_pattern");
  if (patternInsight && facts.topContent.length > 0) {
    const top = facts.topContent[0];
    recommendations.push({
      title: "Create more content like your top performers",
      reason: patternInsight.observation,
      evidence: patternInsight.evidence,
      actionType: "create_content",
      priority: "high",
      assistantPrompt: buildRecommendationPrompt("create_content", {
        detail: `Create content aligned with our strongest recent pattern. Top post: ${top.headline ?? "see analytics"}. Respect brand voice${facts.brandVoice ? `: ${facts.brandVoice}` : ""}.`,
      }),
    });
  }

  if (facts.failedPosts.length > 0) {
    recommendations.push({
      title: "Review failed scheduled posts",
      reason: "Failed publishes may leave gaps in your calendar.",
      evidence: facts.failedPosts.map((p) => `${p.platform} post ${p.id}`),
      actionType: "review_scheduled_posts",
      priority: "high",
      assistantPrompt: buildRecommendationPrompt("review_scheduled_posts", {
        detail: "Analyze my failed scheduled posts and suggest fixes. Do not publish without confirmation.",
      }),
    });
  }

  const engagementUp = facts.metricChanges.find(
    (m) => m.metric === "engagement" && (m.changePercent ?? 0) > 10
  );
  if (engagementUp && recommendations.length === 0) {
    recommendations.push({
      title: "Double down on what's working",
      reason: `Engagement increased ${engagementUp.changePercent}% this period.`,
      evidence: engagementUp.changePercent != null
        ? [`Engagement change: ${engagementUp.changePercent}%`]
        : [],
      actionType: "create_strategy",
      priority: "medium",
      assistantPrompt: buildRecommendationPrompt("create_strategy", {
        detail: "Create a short strategy plan based on our latest growth brief performance wins.",
      }),
    });
  }

  if (facts.brandGoals.length > 0 && recommendations.length < 2) {
    recommendations.push({
      title: `Align next actions with: ${facts.brandGoals[0]}`,
      reason: "Brand Brain goals should guide prioritization.",
      evidence: facts.brandGoals.slice(0, 3).map((g) => `Goal: ${g}`),
      actionType: "create_content",
      priority: "medium",
      assistantPrompt: buildRecommendationPrompt("create_content", {
        detail: `Create content that supports our brand goal: ${facts.brandGoals[0]}. Use approved Brand Brain context only.`,
      }),
    });
  }

  if (facts.topContent.length > 0) {
    recommendations.push({
      title: "Repurpose top-performing content",
      reason: "Extend reach from proven posts without inventing new claims.",
      evidence: facts.topContent.slice(0, 2).map(
        (c) => c.headline ?? c.id
      ),
      actionType: "repurpose_content",
      priority: "low",
      assistantPrompt: buildRecommendationPrompt("repurpose_content", {
        detail: `Repurpose our top content (${facts.topContent[0].id}) for another platform. Use get_content first.`,
      }),
    });
  }

  return recommendations.slice(0, 5);
}

export function buildMinimalBrief(facts: AgentAnalysisFacts): {
  summary: string;
  insights: GrowthInsight[];
  recommendations: GrowthRecommendation[];
} {
  if (!facts.hasSufficientData) {
    return {
      summary:
        "Not enough recent data for a meaningful growth brief. Connect platforms, publish content, and sync analytics.",
      insights: [],
      recommendations: [],
    };
  }

  if (!facts.hasMeaningfulChange) {
    return {
      summary:
        "No significant changes detected for this period. Performance and publishing look steady.",
      insights: buildDeterministicInsights(facts).slice(0, 2),
      recommendations: [],
    };
  }

  const insights = buildDeterministicInsights(facts);
  const recommendations = buildDeterministicRecommendations(facts, insights);
  const summaryParts: string[] = [];
  const eng = facts.metricChanges.find((m) => m.metric === "engagement");
  if (eng?.changePercent != null && eng.meaningful) {
    summaryParts.push(
      `Engagement ${eng.changePercent > 0 ? "increased" : "decreased"} ${Math.abs(eng.changePercent)}%.`
    );
  }
  if (facts.failedPosts.length > 0) {
    summaryParts.push(
      `${facts.failedPosts.length} scheduled post${facts.failedPosts.length === 1 ? "" : "s"} failed.`
    );
  }
  if (summaryParts.length === 0 && insights[0]) {
    summaryParts.push(insights[0].observation);
  }

  return {
    summary: summaryParts.join(" ") || "Growth brief for your workspace.",
    insights,
    recommendations,
  };
}
