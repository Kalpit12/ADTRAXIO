"use client";

import { useCallback, useEffect, useState } from "react";
import { DataConfidence } from "@/components/intelligence/data-confidence";
import { IntelligenceEmptyState } from "@/components/intelligence/intelligence-empty-state";
import { IntelligenceHeader } from "@/components/intelligence/intelligence-header";
import { InsightList } from "@/components/intelligence/insight-list";
import { RecommendationList } from "@/components/intelligence/recommendation-list";
import type { IntelligenceOverview } from "@/lib/intelligence/types";

export function IntelligenceView() {
  const [overview, setOverview] = useState<IntelligenceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/intelligence/overview");
      const payload = (await response.json()) as {
        overview?: IntelligenceOverview;
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Unable to load intelligence.");
        return;
      }

      setOverview(payload.overview ?? null);
    } catch {
      setError("Unable to load intelligence.");
    } finally {
      setLoading(false);
    }
  }, []);

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
        body: JSON.stringify({ preset: "30d" }),
      });

      const payload = (await response.json()) as {
        overview?: IntelligenceOverview;
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Unable to generate insights.");
        return;
      }

      if (payload.overview) {
        setOverview(payload.overview);
      } else {
        await loadOverview();
      }
    } catch {
      setError("Unable to generate insights.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleStatusChange(
    id: string,
    status: "reviewed" | "dismissed" | "acted_on"
  ) {
    setActionLoading(true);

    try {
      const response = await fetch(`/api/intelligence/recommendations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        await loadOverview();
      }
    } finally {
      setActionLoading(false);
    }
  }

  const dataAvailability = overview?.dataAvailability;
  const emptyVariant =
    dataAvailability?.connectedAccounts === 0
      ? "no_accounts"
      : !dataAvailability?.hasAnalytics
        ? "no_data"
        : !overview?.hasGeneration &&
            !dataAvailability?.sufficientForInsights
          ? "insufficient"
          : !overview?.hasGeneration
            ? "no_generation"
            : null;

  return (
    <div className="space-y-10">
      <IntelligenceHeader analyzing={analyzing} onAnalyze={handleAnalyze} />

      {error && (
        <p className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-lg bg-secondary/30" />
          <div className="h-48 animate-pulse rounded-lg bg-secondary/30" />
        </div>
      ) : emptyVariant && !overview?.hasGeneration ? (
        <IntelligenceEmptyState
          variant={
            error?.includes("temporarily unavailable")
              ? "ai_unavailable"
              : emptyVariant
          }
          onAnalyze={handleAnalyze}
        />
      ) : (
        <>
          {overview?.summary && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-foreground">Summary</h2>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {overview.summary}
              </p>
            </section>
          )}

          <section className="space-y-4 border-t border-border/60 pt-10">
            <h2 className="text-sm font-medium text-foreground">Insights</h2>
            <p className="text-xs text-muted-foreground">What changed</p>
            <InsightList insights={overview?.insights ?? []} />
          </section>

          <section className="space-y-4 border-t border-border/60 pt-10">
            <h2 className="text-sm font-medium text-foreground">Recommendations</h2>
            <p className="text-xs text-muted-foreground">
              What to consider next — review before acting
            </p>
            <RecommendationList
              recommendations={overview?.recommendations ?? []}
              onStatusChange={handleStatusChange}
              actionLoading={actionLoading}
            />
          </section>

          <section className="border-t border-border/60 pt-10">
            <DataConfidence
              dataAvailability={dataAvailability ?? null}
              period={overview?.period ?? null}
              generatedAt={overview?.generatedAt ?? null}
              platforms={overview?.platformsAnalyzed ?? []}
              contentAnalyzed={dataAvailability?.contentWithMetricsCount ?? 0}
              campaignsAnalyzed={overview?.campaignsAnalyzed ?? 0}
            />
          </section>
        </>
      )}
    </div>
  );
}
