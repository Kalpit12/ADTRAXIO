import { RecommendationCard } from "@/components/intelligence/recommendation-card";
import type { IntelligenceRecord } from "@/lib/intelligence/types";

interface InsightListProps {
  insights: IntelligenceRecord[];
  compact?: boolean;
}

export function InsightList({ insights, compact = false }: InsightListProps) {
  if (insights.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No insights available for this period.
      </p>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {insights.map((insight) => (
        <RecommendationCard key={insight.id} record={insight} compact={compact} />
      ))}
    </div>
  );
}
