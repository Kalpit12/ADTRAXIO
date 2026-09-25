import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getOrganizationId } from "@/lib/org/get-organization-id";
import { fetchWorkspaceContext } from "@/lib/workspaces/client-context";
import { workspaceScopeFromContext, type WorkspaceScope } from "@/lib/workspaces/scope";

const EMPTY_CLIENT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

function scopeDashboardQuery<
  T extends { is: (c: string, v: null) => T; eq: (c: string, v: string) => T },
>(query: T, scope: WorkspaceScope): T {
  if (!scope.isAgency) return query.is("client_workspace_id", null);
  if (scope.clientWorkspaceId) {
    return query.eq("client_workspace_id", scope.clientWorkspaceId);
  }
  return query.eq("client_workspace_id", EMPTY_CLIENT_WORKSPACE_ID);
}
import { PLATFORM_LABELS, SOCIAL_PLATFORMS } from "@/lib/onboarding/constants";
import type { SocialPlatform } from "@/lib/onboarding/types";
import { previousRange, parseDateRange } from "@/lib/analytics/date-range";
import { sumDailyMetric, type DailyRow } from "@/lib/analytics/aggregate";
import type {
  ConnectedAccount,
  DashboardCampaign,
  DashboardContentItem,
  DashboardData,
  DashboardMetric,
  DashboardUser,
  PerformanceSeriesPoint,
} from "./types";

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

function getFirstName(fullName: string | null, profileName: string | null) {
  const source = fullName?.trim() || profileName?.trim();
  if (!source) return "there";
  return source.split(/\s+/)[0] ?? "there";
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

export async function getDashboardData(): Promise<{
  data?: DashboardData;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return {
      data: {
        user: {
          id: "local",
          firstName: "there",
          fullName: null,
          profileName: null,
          accountType: null,
        },
        metrics: emptyMetrics(),
        performanceSeries: [],
        hasPerformanceData: false,
        activeCampaignCount: 0,
        campaigns: [],
        content: [],
        connectedAccounts: SOCIAL_PLATFORMS.map(({ id, label }) => ({
          platform: id,
          label,
          connected: false,
        })),
      },
    };
  }

  const supabase = createClient();
  if (!supabase) {
    return { error: "Unable to connect to your workspace." };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be signed in to view the dashboard." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, profile_name, account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: profileError.message };
  }

  const orgId = await getOrganizationId(supabase, user.id);

  let campaigns: DashboardCampaign[] = [];
  let activeCampaignCount = 0;
  let content: DashboardContentItem[] = [];
  let analyticsRows: DailyRow[] = [];
  let socialRows:
    | {
        platform: string;
        account_name: string | null;
        username: string | null;
        status: string;
      }[]
    | null = null;

  if (orgId) {
    const { workspace } = await fetchWorkspaceContext();
    const scope = workspace
      ? workspaceScopeFromContext(workspace)
      : { isAgency: false, clientWorkspaceId: null };

    const range = parseDateRange({ preset: "30d" });
    const extendedFrom = previousRange(range).from;

    let campaignQuery = supabase
      .from("campaigns")
      .select("id, name, status, objective, start_date, end_date")
      .eq("organization_id", orgId)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(5);
    campaignQuery = scopeDashboardQuery(campaignQuery, scope);

    let contentQuery = supabase
      .from("content")
      .select(
        "id, headline, topic, platform, content_type, status, created_at"
      )
      .eq("organization_id", orgId)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(6);
    contentQuery = scopeDashboardQuery(contentQuery, scope);

    let socialQuery = supabase
      .from("social_accounts")
      .select("platform, account_name, username, status")
      .eq("organization_id", orgId)
      .eq("status", "connected");
    socialQuery = scopeDashboardQuery(socialQuery, scope);

    let analyticsQuery = supabase
      .from("analytics_daily")
      .select("metric_date, impressions, reach, engagement, clicks")
      .eq("organization_id", orgId)
      .gte("metric_date", extendedFrom)
      .lte("metric_date", range.to);
    analyticsQuery = scopeDashboardQuery(analyticsQuery, scope);

    let activeCountQuery = supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
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

    analyticsRows = (dailyAnalytics ?? []) as DailyRow[];

    socialRows = socialAccountRows;
    activeCampaignCount = activeCount ?? 0;

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

    campaigns =
      campaignRows?.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status as DashboardCampaign["status"],
        objective: c.objective ?? null,
        contentCount: contentCounts.get(c.id) ?? 0,
        startDate: c.start_date ?? null,
        endDate: c.end_date ?? null,
      })) ?? [];

    content =
      contentRows?.map((item) => ({
        id: item.id,
        title: item.headline ?? item.topic ?? "Untitled",
        platform: item.platform,
        contentType: item.content_type,
        status: item.status as DashboardContentItem["status"],
        thumbnailUrl: null,
        createdAt: item.created_at,
      })) ?? [];
  }

  const dashboardUser: DashboardUser = {
    id: user.id,
    firstName: getFirstName(
      profile?.full_name ?? user.user_metadata?.full_name ?? null,
      profile?.profile_name ?? null
    ),
    fullName: profile?.full_name ?? user.user_metadata?.full_name ?? null,
    profileName: profile?.profile_name ?? null,
    accountType: profile?.account_type ?? null,
  };

  const analytics = orgId
    ? buildDashboardAnalytics(analyticsRows)
    : {
        metrics: emptyMetrics(),
        performanceSeries: [],
        hasPerformanceData: false,
      };

  return {
    data: {
      user: dashboardUser,
      metrics: analytics.metrics,
      performanceSeries: analytics.performanceSeries,
      hasPerformanceData: analytics.hasPerformanceData,
      activeCampaignCount,
      campaigns,
      content,
      connectedAccounts: mapConnectedAccounts(socialRows),
    },
  };
}

export function formatPlatformLabel(platform: string) {
  return (
    PLATFORM_LABELS[platform as SocialPlatform] ??
    platform.charAt(0).toUpperCase() + platform.slice(1)
  );
}
