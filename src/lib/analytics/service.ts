import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceScope } from "@/lib/workspaces/scope";
import { LEGACY_WORKSPACE_SCOPE } from "@/lib/workspaces/scope";

const EMPTY_CLIENT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

function scopeAnalyticsQuery<T extends { is: (c: string, v: null) => T; eq: (c: string, v: string) => T }>(
  query: T,
  scope: WorkspaceScope
): T {
  if (!scope.isAgency) return query.is("client_workspace_id", null);
  if (scope.clientWorkspaceId) {
    return query.eq("client_workspace_id", scope.clientWorkspaceId);
  }
  return query.eq("client_workspace_id", EMPTY_CLIENT_WORKSPACE_ID);
}
import { getAccountAccessToken } from "@/lib/social/service";
import { buildContentPerformance, buildOverview } from "./aggregate";
import { hasInsightsScope } from "./capabilities";
import { parseDateRange } from "./date-range";
import { AnalyticsError } from "./errors";
import { metaAnalyticsProvider } from "./providers/meta";
import type {
  AccountPerformanceSummary,
  AnalyticsDateRange,
  AnalyticsOverview,
  ContentPerformanceRow,
  SyncAccountResult,
  SyncSummary,
} from "./types";

type SocialAccountRow = {
  id: string;
  organization_id: string;
  platform: string;
  platform_account_id: string;
  account_name: string | null;
  username: string | null;
  status: string;
  scopes: string[] | null;
  token_expires_at: string | null;
  metadata: { connectionTarget?: "facebook" | "instagram" } | null;
};

function getConnectionTarget(account: SocialAccountRow): "facebook" | "instagram" {
  return account.metadata?.connectionTarget === "instagram"
    ? "instagram"
    : "facebook";
}

async function loadSyncableAccounts(
  supabase: SupabaseClient,
  organizationId?: string
): Promise<SocialAccountRow[]> {
  let query = supabase
    .from("social_accounts")
    .select(
      "id, organization_id, platform, platform_account_id, account_name, username, status, scopes, token_expires_at, metadata"
    )
    .eq("status", "connected")
    .in("platform", ["facebook", "instagram"]);

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query;
  if (error) {
    throw new AnalyticsError("database_error", error.message, 500);
  }

  return (data ?? []) as SocialAccountRow[];
}

async function syncAccount(
  supabase: SupabaseClient,
  account: SocialAccountRow
): Promise<SyncAccountResult> {
  const platform = account.platform as "facebook" | "instagram";
  const connectionTarget = getConnectionTarget(account);
  const result: SyncAccountResult = {
    socialAccountId: account.id,
    platform,
    accountName: account.account_name,
    success: false,
    dailySnapshots: 0,
    contentSnapshots: 0,
  };

  if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
    result.error = "Account token expired.";
    return result;
  }

  if (!hasInsightsScope(platform, connectionTarget, account.scopes ?? [])) {
    result.error = "Insights permission missing. Reconnect the account.";
    return result;
  }

  const accessToken = await getAccountAccessToken(
    supabase,
    account.id,
    account.organization_id
  );

  if (!accessToken) {
    result.error = "Unable to decrypt account token.";
    return result;
  }

  try {
    const until = new Date();
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 7);

    const profile = await metaAnalyticsProvider.getProfileMetrics({
      platform,
      platformAccountId: account.platform_account_id,
      accessToken,
      connectionTarget,
    });

    const dailyMetrics = await metaAnalyticsProvider.getAccountInsights({
      platform,
      platformAccountId: account.platform_account_id,
      accessToken,
      connectionTarget,
      since: since.toISOString().slice(0, 10),
      until: until.toISOString().slice(0, 10),
    });

    for (const day of dailyMetrics) {
      const { error } = await supabase.from("analytics_daily").upsert(
        {
          organization_id: account.organization_id,
          social_account_id: account.id,
          platform,
          metric_date: day.metricDate,
          followers: profile.followers,
          following: profile.following,
          profile_views: day.profileViews,
          impressions: day.impressions,
          reach: day.reach,
          engagement: day.engagement,
          likes: day.likes,
          comments: day.comments,
          shares: day.shares,
          saves: day.saves,
          clicks: day.clicks,
          video_views: day.videoViews,
        },
        { onConflict: "organization_id,social_account_id,metric_date" }
      );

      if (!error) result.dailySnapshots += 1;
    }

    const { data: publishedPosts } = await supabase
      .from("scheduled_posts")
      .select("id, platform_post_id")
      .eq("organization_id", account.organization_id)
      .eq("social_account_id", account.id)
      .eq("status", "published")
      .not("platform_post_id", "is", null)
      .limit(25);

    for (const post of publishedPosts ?? []) {
      if (!post.platform_post_id) continue;

      const contentMetrics = await metaAnalyticsProvider.getContentInsights({
        platform,
        platformPostId: post.platform_post_id as string,
        accessToken,
        connectionTarget,
      });

      if (!contentMetrics) continue;

      const { error } = await supabase.from("content_analytics").upsert(
        {
          organization_id: account.organization_id,
          social_account_id: account.id,
          scheduled_post_id: post.id,
          platform_post_id: contentMetrics.platformPostId,
          platform,
          metric_date: contentMetrics.metricDate,
          impressions: contentMetrics.impressions,
          reach: contentMetrics.reach,
          likes: contentMetrics.likes,
          comments: contentMetrics.comments,
          shares: contentMetrics.shares,
          saves: contentMetrics.saves,
          clicks: contentMetrics.clicks,
          video_views: contentMetrics.videoViews,
          engagement_rate: contentMetrics.engagementRate,
        },
        { onConflict: "organization_id,platform_post_id,metric_date" }
      );

      if (!error) result.contentSnapshots += 1;
    }

    await supabase
      .from("social_accounts")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", account.id)
      .eq("organization_id", account.organization_id);

    result.success = true;
    return result;
  } catch (error) {
    result.error =
      error instanceof Error ? error.message : "Unable to sync analytics.";
    return result;
  }
}

export async function syncOrganizationAnalytics(
  supabase: SupabaseClient,
  organizationId: string
): Promise<SyncSummary> {
  const accounts = await loadSyncableAccounts(supabase, organizationId);
  const results: SyncAccountResult[] = [];

  for (const account of accounts) {
    results.push(await syncAccount(supabase, account));
  }

  return {
    syncedAt: new Date().toISOString(),
    accounts: results,
    successCount: results.filter((item) => item.success).length,
    failureCount: results.filter((item) => !item.success).length,
  };
}

export async function syncAllAnalytics(
  supabase: SupabaseClient
): Promise<SyncSummary> {
  const accounts = await loadSyncableAccounts(supabase);
  const results: SyncAccountResult[] = [];

  for (const account of accounts) {
    results.push(await syncAccount(supabase, account));
  }

  return {
    syncedAt: new Date().toISOString(),
    accounts: results,
    successCount: results.filter((item) => item.success).length,
    failureCount: results.filter((item) => !item.success).length,
  };
}

export async function getAnalyticsOverview(
  supabase: SupabaseClient,
  organizationId: string,
  input: {
    from?: string | null;
    to?: string | null;
    preset?: "7d" | "30d" | "90d" | "custom" | null;
    platform?: string | null;
    socialAccountId?: string | null;
    scope?: WorkspaceScope;
  }
): Promise<AnalyticsOverview> {
  const range = parseDateRange(input);
  const scope = input.scope ?? LEGACY_WORKSPACE_SCOPE;

  let query = supabase
    .from("analytics_daily")
    .select("metric_date, platform, impressions, reach, engagement, followers")
    .eq("organization_id", organizationId)
    .gte("metric_date", range.from)
    .lte("metric_date", range.to)
    .order("metric_date", { ascending: true });

  query = scopeAnalyticsQuery(query, scope);

  if (input.platform === "facebook" || input.platform === "instagram") {
    query = query.eq("platform", input.platform);
  }

  if (input.socialAccountId) {
    query = query.eq("social_account_id", input.socialAccountId);
  }

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") {
      return buildOverview([], range);
    }
    throw new AnalyticsError("database_error", error.message, 500);
  }

  return buildOverview(data ?? [], range);
}

export async function getContentPerformance(
  supabase: SupabaseClient,
  organizationId: string,
  input: {
    from?: string | null;
    to?: string | null;
    preset?: "7d" | "30d" | "90d" | "custom" | null;
    platform?: string | null;
    socialAccountId?: string | null;
    scope?: WorkspaceScope;
  }
): Promise<ContentPerformanceRow[]> {
  const range = parseDateRange(input);
  const scope = input.scope ?? LEGACY_WORKSPACE_SCOPE;

  let query = supabase
    .from("content_analytics")
    .select(
      `
      id,
      scheduled_post_id,
      platform_post_id,
      platform,
      metric_date,
      impressions,
      reach,
      likes,
      comments,
      shares,
      saves,
      engagement_rate,
      scheduled_posts (
        caption,
        published_at,
        social_accounts ( account_name )
      )
    `
    )
    .eq("organization_id", organizationId)
    .gte("metric_date", range.from)
    .lte("metric_date", range.to);

  query = scopeAnalyticsQuery(query, scope);

  if (input.platform === "facebook" || input.platform === "instagram") {
    query = query.eq("platform", input.platform);
  }

  if (input.socialAccountId) {
    query = query.eq("social_account_id", input.socialAccountId);
  }

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return [];
    throw new AnalyticsError("database_error", error.message, 500);
  }

  const normalized = (data ?? []).map((row) => {
    const scheduled = Array.isArray(row.scheduled_posts)
      ? row.scheduled_posts[0]
      : row.scheduled_posts;

    const account = scheduled?.social_accounts
      ? Array.isArray(scheduled.social_accounts)
        ? scheduled.social_accounts[0]
        : scheduled.social_accounts
      : null;

    return {
      ...row,
      scheduled_posts: scheduled
        ? {
            caption: scheduled.caption ?? null,
            published_at: scheduled.published_at ?? null,
            social_accounts: account
              ? { account_name: account.account_name ?? null }
              : null,
          }
        : null,
    };
  });

  return buildContentPerformance(normalized);
}

export async function getAccountPerformanceSummaries(
  supabase: SupabaseClient,
  organizationId: string,
  range: AnalyticsDateRange,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<AccountPerformanceSummary[]> {
  let accountsQuery = supabase
    .from("social_accounts")
    .select("id, platform, account_name, username, status")
    .eq("organization_id", organizationId)
    .eq("status", "connected")
    .in("platform", ["facebook", "instagram"]);

  accountsQuery = scopeAnalyticsQuery(accountsQuery, scope);

  const { data: accounts, error: accountsError } = await accountsQuery;

  if (accountsError) {
    throw new AnalyticsError("database_error", accountsError.message, 500);
  }

  let dailyQuery = supabase
    .from("analytics_daily")
    .select("social_account_id, metric_date, impressions, reach, engagement, followers")
    .eq("organization_id", organizationId)
    .gte("metric_date", range.from)
    .lte("metric_date", range.to);

  dailyQuery = scopeAnalyticsQuery(dailyQuery, scope);

  const { data: dailyRows, error: dailyError } = await dailyQuery;

  if (dailyError && dailyError.code !== "42P01") {
    throw new AnalyticsError("database_error", dailyError.message, 500);
  }

  return (accounts ?? []).map((account) => {
    const rows =
      dailyRows?.filter((row) => row.social_account_id === account.id) ?? [];

    const sum = (field: "impressions" | "reach" | "engagement") => {
      const values = rows
        .map((row) => row[field])
        .filter((value): value is number => typeof value === "number");
      return values.length ? values.reduce((a, b) => a + b, 0) : null;
    };

    const followerValues = rows
      .map((row) => row.followers)
      .filter((value): value is number => typeof value === "number");

    const lastSyncedDate = rows.length
      ? rows.map((row) => row.metric_date).sort().at(-1) ?? null
      : null;

    return {
      socialAccountId: account.id,
      platform: account.platform as "facebook" | "instagram",
      accountName: account.account_name,
      username: account.username,
      impressions: sum("impressions"),
      reach: sum("reach"),
      engagement: sum("engagement"),
      followers: followerValues.length
        ? followerValues.sort((a, b) => b - a)[0]
        : null,
      lastSyncedDate,
    };
  });
}
