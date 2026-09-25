"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { IntelligenceEmptyState } from "@/components/intelligence/intelligence-empty-state";
import { InsightList } from "@/components/intelligence/insight-list";
import { RecommendationList } from "@/components/intelligence/recommendation-list";
import { Button } from "@/components/ui/button";
import type { DataAvailability, IntelligenceOverview } from "@/lib/intelligence/types";

interface IntelligencePanelProps {
  title?: string;
  campaignId?: string | null;
  compact?: boolean;
  showInsights?: boolean;
  maxItems?: number;
  viewAllHref?: string;
}

function resolveEmptyVariant(
  dataAvailability: DataAvailability | null | undefined,
  hasGeneration: boolean
): "no_accounts" | "no_data" | "insufficient" | "no_generation" | null {
  if (!dataAvailability) return hasGeneration ? null : "no_generation";
  if (dataAvailability.connectedAccounts === 0) return "no_accounts";
  if (!dataAvailability.hasAnalytics) return "no_data";
  if (!dataAvailability.sufficientForInsights && !hasGeneration) return "insufficient";
  if (!hasGeneration) return "no_generation";
  return null;
}

export function IntelligencePanel({
  title = "Growth Intelligence",
  campaignId = null,
  compact = true,
  showInsights = true,
  maxItems = 3,
  viewAllHref = "/intelligence",
}: IntelligencePanelProps) {
  const [overview, setOverview] = useState<IntelligenceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = campaignId ? `?campaignId=${campaignId}` : "";

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/intelligence/overview${query}`);
      const payload = (await response.json()) as {
        overview?: IntelligenceOverview;
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Unable to load insights.");
        return;
      }

      setOverview(payload.overview ?? null);
    } catch {
      setError("Unable to load insights.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/intelligence/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, preset: "30d" }),
      });

      const payload = (await response.json()) as {
        overview?: IntelligenceOverview;
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Unable to generate insights.");
        return;
      }

      if (payload.overview) setOverview(payload.overview);
      else await loadOverview();
    } catch {
      setError("Unable to generate insights.");
    } finally {
      setAnalyzing(false);
    }
  }

  const emptyVariant = resolveEmptyVariant(
    overview?.dataAvailability,
    overview?.hasGeneration ?? false
  );

  const insights = (overview?.insights ?? []).slice(0, maxItems);
  const recommendations = (overview?.recommendations ?? []).slice(0, maxItems);

  return (
    <section className={compact ? "space-y-3" : "space-y-6"}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        {!compact && (
          <Button size="sm" onClick={handleAnalyze} disabled={analyzing}>
            {analyzing ? "Analyzing…" : "Analyze performance"}
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <div className="h-16 animate-pulse rounded-md bg-secondary/30" />
      ) : emptyVariant ? (
        <IntelligenceEmptyState
          variant={error?.includes("temporarily unavailable") ? "ai_unavailable" : emptyVariant}
          onAnalyze={handleAnalyze}
          compact={compact}
        />
      ) : (
        <>
          {overview?.summary && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {overview.summary}
            </p>
          )}

          {showInsights && insights.length > 0 && (
            <div>
              {!compact && (
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  What changed
                </p>
              )}
              <InsightList insights={insights} compact={compact} />
            </div>
          )}

          {recommendations.length > 0 && (
            <div>
              {!compact && (
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  What to consider next
                </p>
              )}
              <RecommendationList recommendations={recommendations} compact={compact} />
            </div>
          )}

          {compact && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="xs" variant="outline" onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? "Analyzing…" : "Analyze performance"}
              </Button>
              <Link
                href={viewAllHref}
                className="inline-flex items-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                View all insights
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
