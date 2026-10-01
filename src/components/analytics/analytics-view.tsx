"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";
import { AnalyticsErrorBanner } from "@/components/analytics/analytics-error-banner";
import { AnalyticsInsightBridge } from "@/components/analytics/analytics-insight-bridge";
import { AnalyticsPartialNotice } from "@/components/analytics/analytics-partial-notice";
import { AnalyticsPageSkeleton } from "@/components/analytics/analytics-skeleton";
import { ContentPerformanceTable } from "@/components/analytics/content-performance-table";
import { DateRangeSelector } from "@/components/analytics/date-range-selector";
import { MetricSummary } from "@/components/analytics/metric-summary";
import { AnalyticsPerformanceChart } from "@/components/analytics/performance-chart";
import {
  PlatformFilterControl,
  type PlatformFilter,
} from "@/components/analytics/platform-filter";
import { PlatformPerformance } from "@/components/analytics/platform-performance";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { presetLabel } from "@/lib/analytics/display";
import type { PresetRange } from "@/lib/analytics/date-range";
import type {
  AnalyticsOverview,
  ContentPerformanceRow,
} from "@/lib/analytics/types";
import type { SafeSocialAccount } from "@/lib/social/types";
import { IntelligencePanel } from "@/components/intelligence/intelligence-panel";

type ChartMetric = "impressions" | "reach" | "engagement";

function buildQuery(input: {
  preset: PresetRange;
  customFrom: string;
  customTo: string;
  platform: PlatformFilter;
}): string {
  const params = new URLSearchParams();
  params.set("preset", input.preset);

  if (input.preset === "custom") {
    if (input.customFrom) params.set("from", input.customFrom);
    if (input.customTo) params.set("to", input.customTo);
  }

  if (input.platform !== "all") {
    params.set("platform", input.platform);
  }

  return params.toString();
}

function unavailableSummaryMetrics(
  summary: AnalyticsOverview["summary"] | undefined
): string[] {
  if (!summary) return [];
  const missing: string[] = [];
  if (summary.impressions == null) missing.push("Impressions");
  if (summary.reach == null) missing.push("Reach");
  if (summary.engagement == null) missing.push("Engagement");
  if (summary.followers == null) missing.push("Followers");
  return missing;
}

export function AnalyticsView() {
  const [preset, setPreset] = useState<PresetRange>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("engagement");
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [content, setContent] = useState<ContentPerformanceRow[]>([]);
  const [accounts, setAccounts] = useState<SafeSocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const connectedAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.status === "connected" &&
          (account.platform === "facebook" || account.platform === "instagram")
      ),
    [accounts]
  );

  const availablePlatforms = useMemo(() => {
    const set = new Set<"instagram" | "facebook">();
    connectedAccounts.forEach((account) => {
      if (account.platform === "instagram" || account.platform === "facebook") {
        set.add(account.platform);
      }
    });
    return set;
  }, [connectedAccounts]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query = buildQuery({ preset, customFrom, customTo, platform });

    try {
      const [accountsRes, overviewRes, contentRes] = await Promise.all([
        fetch("/api/social/accounts"),
        fetch(`/api/analytics/overview?${query}`),
        fetch(`/api/analytics/content?${query}`),
      ]);

      const accountsPayload = (await accountsRes.json()) as {
        accounts?: SafeSocialAccount[];
      };
      const overviewPayload = (await overviewRes.json()) as {
        overview?: AnalyticsOverview;
        error?: string;
      };
      const contentPayload = (await contentRes.json()) as {
        content?: ContentPerformanceRow[];
        error?: string;
      };

      if (!overviewRes.ok) {
        setError(overviewPayload.error ?? "Unable to load analytics.");
        return;
      }

      setAccounts(accountsPayload.accounts ?? []);
      setOverview(overviewPayload.overview ?? null);
      setContent(contentPayload.content ?? []);
    } catch {
      setError("Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [preset, customFrom, customTo, platform]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  async function handleRefresh() {
    setSyncing(true);
    setSyncMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/analytics/sync", { method: "POST" });
      const payload = (await response.json()) as {
        syncedAt?: string;
        accounts?: Array<{ success: boolean; platform: string; error?: string }>;
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Unable to refresh analytics.");
        return;
      }

      setLastSyncedAt(payload.syncedAt ?? new Date().toISOString());

      const failures = (payload.accounts ?? []).filter((item) => !item.success);
      if (failures.length > 0) {
        setSyncMessage(
          "Partial refresh — some accounts could not sync. Try again shortly."
        );
      } else {
        setSyncMessage("Analytics refreshed.");
      }

      await loadAnalytics();
    } catch {
      setError("Unable to refresh analytics.");
    } finally {
      setSyncing(false);
    }
  }

  const emptyVariant =
    connectedAccounts.length === 0
      ? "no_accounts"
      : !overview?.summary.hasData && content.length === 0
        ? "no_data"
        : null;

  const partialMetrics = useMemo(
    () => unavailableSummaryMetrics(overview?.summary),
    [overview?.summary]
  );

  const showPartialNotice =
    emptyVariant == null &&
    overview?.summary.hasData &&
    partialMetrics.length > 0 &&
    partialMetrics.length < 4;

  const contextLine = useMemo(() => {
    if (preset === "custom" && customFrom && customTo) {
      return `${customFrom} → ${customTo}`;
    }
    return presetLabel(preset);
  }, [preset, customFrom, customTo]);

  return (
    <div className="space-y-8 lg:space-y-10">
      <PageHeader
        title="Analytics"
        description="Understand what is driving your social growth."
      >
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={syncing}
          onClick={() => void handleRefresh()}
        >
          {syncing ? "Refreshing…" : "Refresh data"}
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-4 border-b border-border/50 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <DateRangeSelector
            preset={preset}
            customFrom={customFrom}
            customTo={customTo}
            onPresetChange={setPreset}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />
          <PlatformFilterControl
            value={platform}
            available={availablePlatforms}
            onChange={setPlatform}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          <p>
            <span className="text-foreground/80">Period:</span> {contextLine}
          </p>
          {connectedAccounts.length > 0 && (
            <p className="mt-0.5">
              <span className="text-foreground/80">Channels:</span>{" "}
              {connectedAccounts.length} connected
            </p>
          )}
          {lastSyncedAt && (
            <p className="mt-0.5">
              Last refresh {new Date(lastSyncedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {error && (
        <AnalyticsErrorBanner
          message={error}
          onRetry={() => void loadAnalytics()}
        />
      )}

      {syncMessage && (
        <p className="text-sm text-muted-foreground" role="status">
          {syncMessage}
        </p>
      )}

      {loading ? (
        <AnalyticsPageSkeleton />
      ) : emptyVariant ? (
        <AnalyticsEmptyState
          variant={emptyVariant}
          onRefresh={() => void handleRefresh()}
          refreshing={syncing}
        />
      ) : (
        <div className="space-y-8 lg:space-y-10">
          {showPartialNotice && (
            <AnalyticsPartialNotice unavailableMetrics={partialMetrics} />
          )}

          <MetricSummary
            impressions={overview?.summary.impressions ?? null}
            reach={overview?.summary.reach ?? null}
            engagement={overview?.summary.engagement ?? null}
            followers={overview?.summary.followers ?? null}
          />

          <AnalyticsPerformanceChart
            series={overview?.series ?? []}
            activeMetric={chartMetric}
            onMetricChange={setChartMetric}
          />

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
            <PlatformPerformance platforms={overview?.platforms ?? []} />
            <div className="rounded-lg border border-border/60 bg-adtraxio-surface/10 px-5 py-5 sm:px-6">
              <IntelligencePanel
                title="From your data"
                compact
                maxItems={2}
                viewAllHref="/intelligence"
              />
            </div>
          </div>

          <ContentPerformanceTable rows={content} />

          <AnalyticsInsightBridge />
        </div>
      )}
    </div>
  );
}
