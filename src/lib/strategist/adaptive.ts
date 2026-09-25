import type { RelevantLearning } from "@/lib/learning/relevance";
import { detectMixedEvidence } from "@/lib/learning/relevance";
import type {
  ConfidenceLevel,
  StrategicAdaptation,
  StrategicAdaptiveBlock,
  StrategicHistoricalEvidenceRef,
} from "./types";

export function buildAdaptiveBlock(
  validated: {
    currentSituation?: string;
    historicalEvidence?: Array<{
      learningId?: string;
      summary?: string;
      recency?: string;
      sampleContext?: string;
    }>;
    adaptations?: Array<{
      learning?: string;
      learningId?: string;
      relevance?: string;
      application?: string;
      confidence?: string;
      adaptationType?: string;
    }>;
    mixedEvidenceNote?: string;
  },
  relevant: RelevantLearning[]
): StrategicAdaptiveBlock {
  const byId = new Map(relevant.map((r) => [r.record.id, r]));

  const historicalEvidence: StrategicHistoricalEvidenceRef[] = [];
  const learningIds = new Set<string>();

  for (const item of relevant) {
    learningIds.add(item.record.id);
    const learning = item.record.learning as { summary?: string };
    historicalEvidence.push({
      learningId: item.record.id,
      summary: learning.summary ?? item.record.objective,
      recency: item.recency,
      sampleContext:
        item.sampleSize != null
          ? `${item.sampleSize} comparable unit(s); ${item.sampleStrength} evidence`
          : `${item.sampleStrength} evidence`,
    });
  }

  for (const raw of validated.historicalEvidence ?? []) {
    const id = raw.learningId?.trim();
    if (id && byId.has(id)) {
      learningIds.add(id);
      if (!historicalEvidence.find((h) => h.learningId === id)) {
        historicalEvidence.push({
          learningId: id,
          summary: String(raw.summary ?? byId.get(id)!.record.objective),
          recency: String(raw.recency ?? byId.get(id)!.recency),
          sampleContext: raw.sampleContext ?? undefined,
        });
      }
    }
  }

  const adaptations: StrategicAdaptation[] = (validated.adaptations ?? [])
    .map((a) => {
      let learningId = a.learningId?.trim() ?? null;
      if (!learningId && a.learning) {
        const match = relevant.find((r) => {
          const summary = (r.record.learning as { summary?: string }).summary ?? "";
          return (
            summary.toLowerCase().includes(a.learning!.toLowerCase().slice(0, 40)) ||
            a.learning!.toLowerCase().includes(summary.toLowerCase().slice(0, 40))
          );
        });
        learningId = match?.record.id ?? null;
      }
      if (learningId) learningIds.add(learningId);

      const confidence: ConfidenceLevel =
        a.confidence === "high" || a.confidence === "medium" || a.confidence === "low"
          ? a.confidence
          : "medium";

      return {
        learningId,
        learning: String(a.learning ?? "").slice(0, 600),
        relevance: String(a.relevance ?? "").slice(0, 600),
        application: String(a.application ?? "").slice(0, 600),
        confidence,
        adaptationType: String(a.adaptationType ?? "content_type").slice(0, 80),
      };
    })
    .filter((a) => a.learning || a.application);

  const mixedEvidenceNote =
    validated.mixedEvidenceNote ??
    (detectMixedEvidence(relevant)
      ? "Historical learnings show mixed patterns; strategy should acknowledge uncertainty."
      : undefined);

  const evidenceSummary =
    relevant.length === 0
      ? "Strategy based primarily on current workspace evidence."
      : `${relevant.length} validated learning(s) informed adaptations.`;

  return {
    currentSituation: String(
      validated.currentSituation ?? "See summary and current-period evidence."
    ).slice(0, 2000),
    historicalEvidence,
    adaptations,
    learningIds: [...learningIds],
    evidenceSummary,
    mixedEvidenceNote,
  };
}
