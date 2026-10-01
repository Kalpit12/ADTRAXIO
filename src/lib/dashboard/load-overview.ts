import type { SupabaseClient } from "@supabase/supabase-js";
import { previousRange, parseDateRange } from "@/lib/analytics/date-range";
import { sumDailyMetric, type DailyRow } from "@/lib/analytics/aggregate";
import { SOCIAL_PLATFORMS } from "@/lib/onboarding/constants";
import type { WorkspaceScope } from "@/lib/workspaces/scope";
import type {
  ConnectedAccount,
  DashboardCampaign,
  DashboardContentItem,
  DashboardMetric,
  PerformanceSeriesPoint,
} from "./types";

const EMPTY_CLIENT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

const METRIC_LABELS: Record<DashboardMetric["key"], string> = {
  reach: "Reach",
  engagement: "Engagement",
  clicks: "Clicks",
  conversions: "Conversions",
};

function emptyMetrics(): DashboardMetric[] {
  return (Object.keys(METRIC_LABELS) as DashboardMetric["key"][]).map(
    (key) => ({
      key,
      label: METRIC_LABELS[key],
      value: null,
      changePercent: null,
      hasData: false,
    })
  );
}

function percentChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function buildDashboardAnalytics(rows: DailyRow[]): {
  metrics: DashboardMetric[];
  performanceSeries: PerformanceSeriesPoint[];
  hasPerformanceData: boolean;
} {
  const currentRange = parseDateRange({ preset: "30d" });
  const prevRange = previousRange(currentRange);

  const currentRows = rows.filter(
    (row) =>
      row.metric_date >= currentRange.from && row.metric_date <= currentRange.to
  );
  const previousRows = rows.filter(
    (row) => row.metric_date >= prevRange.from && row.metric_date <= prevRange.to
  );

  const reach = sumDailyMetric(currentRows, "reach");
  const engagement = sumDailyMetric(currentRows, "engagement");
  const clicks = sumDailyMetric(currentRows, "clicks");

  const hasPerformanceData =
    reach != null || engagement != null || clicks != null;

  const metrics: DashboardMetric[] = [
    {
      key: "reach",
      label: METRIC_LABELS.reach,
      value: reach,
      changePercent: percentChange(reach, sumDailyMetric(previousRows, "reach")),
      hasData: reach != null,
    },
    {
      key: "engagement",
      label: METRIC_LABELS.engagement,
      value: engagement,
      changePercent: percentChange(
        engagement,
        sumDailyMetric(previousRows, "engagement")
      ),
      hasData: engagement != null,
    },
    {
      key: "clicks",
      label: METRIC_LABELS.clicks,
      value: clicks,
      changePercent: percentChange(clicks, sumDailyMetric(previousRows, "clicks")),
      hasData: clicks != null,
    },
    {
      key: "conversions",
      label: METRIC_LABELS.conversions,
      value: null,
      changePercent: null,
      hasData: false,
    },
  ];

  const byDate = new Map<string, PerformanceSeriesPoint>();
  for (const row of currentRows) {
    const existing = byDate.get(row.metric_date) ?? {
      date: row.metric_date,
      reach: 0,
      engagement: 0,
      clicks: 0,
      conversions: 0,
    };

    if (row.reach != null) existing.reach += row.reach;
    if (row.engagement != null) existing.engagement += row.engagement;
    if (row.clicks != null) existing.clicks += row.clicks;

    byDate.set(row.metric_date, existing);
  }

  const performanceSeries = Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return { metrics, performanceSeries, hasPerformanceData };
}

function scopeDashboardQuery<
  T extends { is: (c: string, v: null) => T; eq: (c: string, v: string) => T },
>(query: T, scope: WorkspaceScope): T {
  if (!scope.isAgency) return query.is("client_workspace_id", null);
  if (scope.clientWorkspaceId) {
    return query.eq("client_workspace_id", scope.clientWorkspaceId);
  }
  return query.eq("client_workspace_id", EMPTY_CLIENT_WORKSPACE_ID);
}

function mapConnectedAccounts(
  socialRows:
    | {
        platform: string;
        account_name: string | null;
        username: string | null;
        status: string;
      }[]
    | null
): ConnectedAccount[] {
  const byPlatform = new Map(
    socialRows?.map((row) => [row.platform, row]) ?? []
  );

  return SOCIAL_PLATFORMS.map(({ id, label }) => {
    const row = byPlatform.get(id);
    return {
      platform: id,
      label,
      connected: row?.status === "connected",
      accountName: row?.account_name ?? null,
      username: row?.username ?? null,
    };
  });
}

export async function loadDashboardOverviewForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  scope: WorkspaceScope
): Promise<{
  metrics: DashboardMetric[];
  performanceSeries: PerformanceSeriesPoint[];
  hasPerformanceData: boolean;
  activeCampaignCount: number;
  campaigns: DashboardCampaign[];
  content: DashboardContentItem[];
  connectedAccounts: ConnectedAccount[];
}> {
  const range = parseDateRange({ preset: "30d" });
  const extendedFrom = previousRange(range).from;

  let campaignQuery = supabase
    .from("campaigns")
    .select("id, name, status, objective, start_date, end_date")
    .eq("organization_id", organizationId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(5);
  campaignQuery = scopeDashboardQuery(campaignQuery, scope);

  let contentQuery = supabase
    .from("content")
    .select("id, headline, topic, platform, content_type, status, created_at")
    .eq("organization_id", organizationId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(6);
  contentQuery = scopeDashboardQuery(contentQuery, scope);

  let socialQuery = supabase
    .from("social_accounts")
    .select("platform, account_name, username, status")
    .eq("organization_id", organizationId)
    .eq("status", "connected");
  socialQuery = scopeDashboardQuery(socialQuery, scope);

  let analyticsQuery = supabase
    .from("analytics_daily")
    .select("metric_date, impressions, reach, engagement, clicks")
    .eq("organization_id", organizationId)
    .gte("metric_date", extendedFrom)
    .lte("metric_date", range.to);
  analyticsQuery = scopeDashboardQuery(analyticsQuery, scope);

  let activeCountQuery = supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "active");
  activeCountQuery = scopeDashboardQuery(activeCountQuery, scope);

  const [
    { data: campaignRows },
    { data: contentRows },
    { data: socialAccountRows },
    { data: dailyAnalytics },
    { count: activeCount },
  ] = await Promise.all([
    campaignQuery,
    contentQuery,
    socialQuery,
    analyticsQuery,
    activeCountQuery,
  ]);

  const analyticsRows = (dailyAnalytics ?? []) as DailyRow[];
  const analytics = buildDashboardAnalytics(analyticsRows);

  const campaignIds = campaignRows?.map((c) => c.id) ?? [];
  const contentCounts = new Map<string, number>();

  if (campaignIds.length > 0) {
    const { data: contentLinks } = await supabase
      .from("campaign_content")
      .select("campaign_id")
      .in("campaign_id", campaignIds);

    for (const link of contentLinks ?? []) {
      const id = link.campaign_id as string;
      contentCounts.set(id, (contentCounts.get(id) ?? 0) + 1);
    }
  }

  const campaigns =
    campaignRows?.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status as DashboardCampaign["status"],
      objective: c.objective ?? null,
      contentCount: contentCounts.get(c.id) ?? 0,
      startDate: c.start_date ?? null,
      endDate: c.end_date ?? null,
    })) ?? [];

  const content =
    contentRows?.map((item) => ({
      id: item.id,
      title: item.headline ?? item.topic ?? "Untitled",
      platform: item.platform,
      contentType: item.content_type,
      status: item.status as DashboardContentItem["status"],
      thumbnailUrl: null,
      createdAt: item.created_at,
    })) ?? [];

  return {
    ...analytics,
    activeCampaignCount: activeCount ?? 0,
    campaigns,
    content,
    connectedAccounts: mapConnectedAccounts(socialAccountRows),
  };
}

export { emptyMetrics, buildDashboardAnalytics };
