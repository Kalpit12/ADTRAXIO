"use client";

import { RecommendationCard } from "@/components/intelligence/recommendation-card";
import type { IntelligenceRecord } from "@/lib/intelligence/types";

interface RecommendationListProps {
  recommendations: IntelligenceRecord[];
  compact?: boolean;
  onStatusChange?: (id: string, status: "reviewed" | "dismissed" | "acted_on") => void;
  actionLoading?: boolean;
}

export function RecommendationList({
  recommendations,
  compact = false,
  onStatusChange,
  actionLoading = false,
}: RecommendationListProps) {
  if (recommendations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No recommendations yet. Analyze performance to generate suggestions.
      </p>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {recommendations.map((record) => (
        <RecommendationCard
          key={record.id}
          record={record}
          compact={compact}
          onStatusChange={onStatusChange}
          actionLoading={actionLoading}
        />
      ))}
    </div>
  );
}
