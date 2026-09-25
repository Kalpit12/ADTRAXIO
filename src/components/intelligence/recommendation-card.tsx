"use client";

import { Button } from "@/components/ui/button";
import type { IntelligenceRecord } from "@/lib/intelligence/types";
import { cn } from "@/lib/utils";

interface RecommendationCardProps {
  record: IntelligenceRecord;
  compact?: boolean;
  onStatusChange?: (id: string, status: "reviewed" | "dismissed" | "acted_on") => void;
  actionLoading?: boolean;
}

const PRIORITY_STYLES = {
  high: "text-amber-300",
  medium: "text-muted-foreground",
  low: "text-muted-foreground/70",
};

export function RecommendationCard({
  record,
  compact = false,
  onStatusChange,
  actionLoading = false,
}: RecommendationCardProps) {
  const isInsight = record.recordKind === "insight";

  return (
    <article
      className={cn(
        "rounded-lg border border-border/60",
        compact ? "px-3 py-3" : "px-4 py-4"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{record.title}</p>
          <p className="mt-1 text-xs capitalize text-muted-foreground">{record.type}</p>
        </div>
        {!isInsight && record.priority && (
          <span
            className={cn(
              "text-xs font-medium capitalize",
              PRIORITY_STYLES[record.priority]
            )}
          >
            {record.priority}
          </span>
        )}
        {isInsight && record.confidence && (
          <span className="text-xs capitalize text-muted-foreground">
            {record.confidence} confidence
          </span>
        )}
      </div>

      {record.observation && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {isInsight ? (
            <>
              <span className="text-foreground/80">Observed: </span>
              {record.observation}
            </>
          ) : (
            <>
              <span className="text-foreground/80">Reason: </span>
              {record.observation}
            </>
          )}
        </p>
      )}

      {record.recommendation && (
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          <span className="text-muted-foreground">Consider: </span>
          {record.recommendation}
        </p>
      )}

      {record.evidence.length > 0 && !compact && (
        <ul className="mt-3 space-y-1 border-t border-border/50 pt-3">
          {record.evidence.map((item) => (
            <li key={item} className="text-xs text-muted-foreground">
              · {item}
            </li>
          ))}
        </ul>
      )}

      {!isInsight && onStatusChange && record.status === "new" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="xs"
            variant="outline"
            disabled={actionLoading}
            onClick={() => onStatusChange(record.id, "reviewed")}
          >
            Mark reviewed
          </Button>
          <Button
            size="xs"
            variant="ghost"
            disabled={actionLoading}
            onClick={() => onStatusChange(record.id, "dismissed")}
          >
            Dismiss
          </Button>
        </div>
      )}
    </article>
  );
}
