"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";
import { AnalyticsHeader } from "@/components/analytics/analytics-header";
import { ContentPerformanceTable } from "@/components/analytics/content-performance-table";
import { DateRangeSelector } from "@/components/analytics/date-range-selector";
import { MetricSummary } from "@/components/analytics/metric-summary";
import { AnalyticsPerformanceChart } from "@/components/analytics/performance-chart";
import { PlatformPerformance } from "@/components/analytics/platform-performance";
import type { PresetRange } from "@/lib/analytics/date-range";
import type {
  AnalyticsOverview,
  ContentPerformanceRow,
} from "@/lib/analytics/types";
import type { SafeSocialAccount } from "@/lib/social/types";
import { IntelligencePanel } from "@/components/intelligence/intelligence-panel";
import { cn } from "@/lib/utils";

type PlatformFilter = "all" | "instagram" | "facebook";
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
    const set = new Set(connectedAccounts.map((account) => account.platform));
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
        const labels = failures
          .map((item) => `${item.platform}: ${item.error ?? "failed"}`)
          .join(" · ");
        setSyncMessage(`Partial refresh. ${labels}`);
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

  return (
    <div className="space-y-8">
      <AnalyticsHeader
        syncing={syncing}
        lastSyncedAt={lastSyncedAt}
        onRefresh={() => void handleRefresh()}
      />

      <DateRangeSelector
        preset={preset}
        customFrom={customFrom}
        customTo={customTo}
        onPresetChange={setPreset}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
      />

      <div className="flex flex-wrap gap-2">
        {(["all", "instagram", "facebook"] as const).map((item) => {
          if (item !== "all" && !availablePlatforms.has(item)) return null;

          return (
            <button
              key={item}
              type="button"
              onClick={() => setPlatform(item)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                platform === item
                  ? "border-adtraxio-accent/40 bg-adtraxio-accent/5 text-foreground"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {item}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {syncMessage && (
        <p className="text-sm text-muted-foreground">{syncMessage}</p>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-md bg-secondary/30" />
          <div className="h-64 animate-pulse rounded-md bg-secondary/30" />
        </div>
      ) : emptyVariant ? (
        <AnalyticsEmptyState variant={emptyVariant} />
      ) : (
        <>
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

          <PlatformPerformance platforms={overview?.platforms ?? []} />

          <ContentPerformanceTable rows={content} />

          <div className="border-t border-border/60 pt-8">
            <IntelligencePanel
              title="Insights"
              compact
              maxItems={2}
              viewAllHref="/intelligence"
            />
          </div>
        </>
      )}
    </div>
  );
}
