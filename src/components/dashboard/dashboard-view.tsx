"use client";

import { useEffect, useState } from "react";
import { AIInsightCard } from "@/components/dashboard/ai-insight-card";
import { CampaignTable } from "@/components/dashboard/campaign-table";
import { ConnectedAccounts } from "@/components/dashboard/connected-accounts";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { AssistantLauncher } from "@/components/dashboard/assistant-launcher";
import { GrowthBriefCard } from "@/components/dashboard/growth-brief-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentReportsPanel } from "@/components/reports/recent-reports-panel";
import { UpcomingPosts } from "@/components/dashboard/upcoming-posts";
import { RecentContent } from "@/components/dashboard/recent-content";
import { DashboardSurface } from "@/components/dashboard/dashboard-panel";
import { getDashboardData } from "@/lib/dashboard/service";
import type { DashboardData } from "@/lib/dashboard/types";

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardData().then((result) => {
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) setData(result.data);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-10">
        <div className="h-28 animate-pulse rounded-lg bg-secondary/30" />
        <div className="h-36 animate-pulse rounded-lg bg-secondary/30" />
        <div className="h-72 animate-pulse rounded-lg bg-secondary/30" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {error ?? "Unable to load dashboard."}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <DashboardHeader firstName={data.user.firstName} />

      <DashboardSurface className="divide-y divide-border/60 sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
        {data.metrics.map((metric) => (
          <MetricCard key={metric.key} metric={metric} />
        ))}
      </DashboardSurface>

      <div className="border-t border-border/60 pt-10">
        <GrowthBriefCard />
      </div>

      <div className="border-t border-border/60 pt-10">
        <AIInsightCard hasData={data.hasPerformanceData} />
      </div>

      <div className="border-t border-border/60 pt-10">
        <PerformanceChart
          hasData={data.hasPerformanceData}
          series={data.performanceSeries}
        />
      </div>

      <div className="grid gap-10 xl:grid-cols-2 xl:gap-12">
        <CampaignTable
          campaigns={data.campaigns}
          activeCampaignCount={data.activeCampaignCount}
        />
        <RecentContent items={data.content} />
      </div>

      <div className="grid gap-10 border-t border-border/60 pt-10 lg:grid-cols-2 lg:gap-12">
        <ConnectedAccounts accounts={data.connectedAccounts} />
        <UpcomingPosts />
      </div>

      <div className="border-t border-border/60 pt-10">
        <RecentReportsPanel />
      </div>

      <div className="border-t border-border/60 pt-10">
        <AssistantLauncher />
      </div>

      <div className="border-t border-border/60 pt-10">
        <QuickActions />
      </div>
    </div>
  );
}
