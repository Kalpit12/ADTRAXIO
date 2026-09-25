import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceScope } from "@/lib/workspaces/scope";
import { LEGACY_WORKSPACE_SCOPE } from "@/lib/workspaces/scope";

const EMPTY_CLIENT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

function scopeCampaignQuery<T extends { is: (c: string, v: null) => T; eq: (c: string, v: string) => T }>(
  query: T,
  scope: WorkspaceScope
): T {
  if (!scope.isAgency) return query.is("client_workspace_id", null);
  if (scope.clientWorkspaceId) {
    return query.eq("client_workspace_id", scope.clientWorkspaceId);
  }
  return query.eq("client_workspace_id", EMPTY_CLIENT_WORKSPACE_ID);
}
import { calculateCampaignPerformance } from "./performance";
import { CampaignValidationError } from "./validation";
import type {
  CampaignDetail,
  CampaignRecord,
  CreateCampaignInput,
  UpdateCampaignInput,
  CampaignPerformance,
} from "./types";

type CampaignRow = {
  id: string;
  organization_id: string;
  created_by: string | null;
  name: string;
  description: string | null;
  objective: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

function mapCampaign(row: CampaignRow): CampaignRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    name: row.name,
    description: row.description,
    objective: row.objective as CampaignRecord["objective"],
    status: row.status as CampaignRecord["status"],
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function verifyCampaignOwnership(
  supabase: SupabaseClient,
  campaignId: string,
  organizationId: string,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<CampaignRow> {
  let query = supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("organization_id", organizationId);

  query = scopeCampaignQuery(query, scope);

  const { data, error } = await query.maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new CampaignValidationError("Campaign not found.");

  return data as CampaignRow;
}

async function verifyContentOwnership(
  supabase: SupabaseClient,
  contentId: string,
  organizationId: string,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<void> {
  let query = supabase
    .from("content")
    .select("id")
    .eq("id", contentId)
    .eq("organization_id", organizationId);

  query = scopeCampaignQuery(query, scope);

  const { data } = await query.maybeSingle();

  if (!data) {
    throw new CampaignValidationError("Content not found in this workspace.");
  }
}

async function verifySocialAccount(
  supabase: SupabaseClient,
  socialAccountId: string,
  organizationId: string,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<void> {
  let query = supabase
    .from("social_accounts")
    .select("id, status, platform")
    .eq("id", socialAccountId)
    .eq("organization_id", organizationId);

  query = scopeCampaignQuery(query, scope);

  const { data } = await query.maybeSingle();

  if (!data) {
    throw new CampaignValidationError("Social account not found.");
  }
  if (data.status !== "connected") {
    throw new CampaignValidationError("Social account is not connected.");
  }
  if (data.platform !== "facebook" && data.platform !== "instagram") {
    throw new CampaignValidationError("Only Facebook and Instagram are supported.");
  }
}

export async function createCampaign(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: CreateCampaignInput,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<CampaignRecord> {
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      organization_id: organizationId,
      client_workspace_id: scope.isAgency ? scope.clientWorkspaceId : null,
      created_by: userId,
      name: input.name,
      description: input.description ?? null,
      objective: input.objective,
      status: input.status ?? "draft",
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const campaign = mapCampaign(data as CampaignRow);

  if (input.socialAccountIds?.length) {
    for (const socialAccountId of input.socialAccountIds) {
      await attachCampaignAccount(
        supabase,
        organizationId,
        campaign.id,
        socialAccountId,
        scope
      );
    }
  }

  return campaign;
}

export async function updateCampaign(
  supabase: SupabaseClient,
  organizationId: string,
  campaignId: string,
  input: UpdateCampaignInput,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<CampaignRecord> {
  await verifyCampaignOwnership(supabase, campaignId, organizationId, scope);

  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.description !== undefined) payload.description = input.description;
  if (input.objective !== undefined) payload.objective = input.objective;
  if (input.status !== undefined) payload.status = input.status;
  if (input.startDate !== undefined) payload.start_date = input.startDate;
  if (input.endDate !== undefined) payload.end_date = input.endDate;

  const { data, error } = await supabase
    .from("campaigns")
    .update(payload)
    .eq("id", campaignId)
    .eq("organization_id", organizationId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapCampaign(data as CampaignRow);
}

export async function archiveCampaign(
  supabase: SupabaseClient,
  organizationId: string,
  campaignId: string,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<void> {
  await updateCampaign(supabase, organizationId, campaignId, {
    status: "archived",
  }, scope);
}

export async function listCampaigns(
  supabase: SupabaseClient,
  organizationId: string,
  options?: {
    status?: string | null;
    includeArchived?: boolean;
    sort?: "newest" | "oldest" | "name" | "status";
    scope?: WorkspaceScope;
  }
): Promise<CampaignRecord[]> {
  const scope = options?.scope ?? LEGACY_WORKSPACE_SCOPE;
  let query = supabase
    .from("campaigns")
    .select("*")
    .eq("organization_id", organizationId);

  query = scopeCampaignQuery(query, scope);

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  } else if (!options?.includeArchived) {
    query = query.neq("status", "archived");
  }

  switch (options?.sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "name":
      query = query.order("name", { ascending: true });
      break;
    case "status":
      query = query.order("status", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }

  const campaigns = (data ?? []).map((row) => mapCampaign(row as CampaignRow));

  if (campaigns.length === 0) return campaigns;

  const ids = campaigns.map((c) => c.id);

  const [{ data: contentLinks }, { data: accountLinks }] = await Promise.all([
    supabase.from("campaign_content").select("campaign_id").in("campaign_id", ids),
    supabase
      .from("campaign_accounts")
      .select("campaign_id, social_accounts(platform)")
      .in("campaign_id", ids),
  ]);

  const contentCounts = new Map<string, number>();
  for (const link of contentLinks ?? []) {
    contentCounts.set(
      link.campaign_id as string,
      (contentCounts.get(link.campaign_id as string) ?? 0) + 1
    );
  }

  const accountCounts = new Map<string, number>();
  const platformSets = new Map<string, Set<string>>();

  for (const link of accountLinks ?? []) {
    const campaignId = link.campaign_id as string;
    accountCounts.set(campaignId, (accountCounts.get(campaignId) ?? 0) + 1);

    const account = link.social_accounts as { platform?: string } | null;
    if (account?.platform) {
      const set = platformSets.get(campaignId) ?? new Set<string>();
      set.add(account.platform);
      platformSets.set(campaignId, set);
    }
  }

  return campaigns.map((campaign) => ({
    ...campaign,
    contentCount: contentCounts.get(campaign.id) ?? 0,
    accountCount: accountCounts.get(campaign.id) ?? 0,
    platforms: Array.from(platformSets.get(campaign.id) ?? []),
  }));
}

export async function getCampaign(
  supabase: SupabaseClient,
  organizationId: string,
  campaignId: string,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<CampaignDetail | null> {
  const row = await verifyCampaignOwnership(
    supabase,
    campaignId,
    organizationId,
    scope
  ).catch(() => null);

  if (!row) return null;

  const campaign = mapCampaign(row);

  const [{ data: contentLinks }, { data: accountLinks }] = await Promise.all([
    supabase
      .from("campaign_content")
      .select("id, content_id, created_at, content(headline, platform, status)")
      .eq("campaign_id", campaignId),
    supabase
      .from("campaign_accounts")
      .select(
        "id, social_account_id, created_at, social_accounts(platform, account_name, username)"
      )
      .eq("campaign_id", campaignId),
  ]);

  const contentIds = (contentLinks ?? []).map((link) => link.content_id as string);

  const { data: posts } = contentIds.length
    ? await supabase
        .from("scheduled_posts")
        .select("content_id, status, published_at")
        .in("content_id", contentIds)
    : { data: [] };

  const postsByContent = new Map<
    string,
    { status: string; published_at: string | null }
  >();
  for (const post of posts ?? []) {
    if (!post.content_id) continue;
    postsByContent.set(post.content_id as string, {
      status: post.status as string,
      published_at: post.published_at as string | null,
    });
  }

  const publishing = { published: 0, scheduled: 0, failed: 0 };
  for (const post of posts ?? []) {
    if (post.status === "published") publishing.published += 1;
    else if (post.status === "scheduled") publishing.scheduled += 1;
    else if (post.status === "failed") publishing.failed += 1;
  }

  return {
    ...campaign,
    contentCount: contentLinks?.length ?? 0,
    accountCount: accountLinks?.length ?? 0,
    content: (contentLinks ?? []).map((link) => {
      const content = link.content as {
        headline?: string | null;
        platform?: string | null;
        status?: string | null;
      } | null;
      const post = postsByContent.get(link.content_id as string);
      return {
        id: link.id as string,
        contentId: link.content_id as string,
        headline: content?.headline ?? null,
        platform: content?.platform ?? null,
        status: content?.status ?? null,
        attachedAt: link.created_at as string,
        publishingStatus: post?.status ?? null,
        publishedAt: post?.published_at ?? null,
      };
    }),
    accounts: (accountLinks ?? []).map((link) => {
      const account = link.social_accounts as {
        platform?: string;
        account_name?: string | null;
        username?: string | null;
      } | null;
      return {
        id: link.id as string,
        socialAccountId: link.social_account_id as string,
        platform: account?.platform ?? "unknown",
        accountName: account?.account_name ?? null,
        username: account?.username ?? null,
        attachedAt: link.created_at as string,
      };
    }),
    publishing,
  };
}

export async function attachCampaignContent(
  supabase: SupabaseClient,
  organizationId: string,
  campaignId: string,
  contentId: string,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<void> {
  await verifyCampaignOwnership(supabase, campaignId, organizationId, scope);
  await verifyContentOwnership(supabase, contentId, organizationId, scope);

  const { error } = await supabase.from("campaign_content").insert({
    campaign_id: campaignId,
    content_id: contentId,
  });

  if (error) {
    if (error.code === "23505") {
      throw new CampaignValidationError("Content is already attached to this campaign.");
    }
    throw new Error(error.message);
  }
}

export async function detachCampaignContent(
  supabase: SupabaseClient,
  organizationId: string,
  campaignId: string,
  contentId: string,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<void> {
  await verifyCampaignOwnership(supabase, campaignId, organizationId, scope);

  const { error } = await supabase
    .from("campaign_content")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("content_id", contentId);

  if (error) throw new Error(error.message);
}

export async function attachCampaignAccount(
  supabase: SupabaseClient,
  organizationId: string,
  campaignId: string,
  socialAccountId: string,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<void> {
  await verifyCampaignOwnership(supabase, campaignId, organizationId, scope);
  await verifySocialAccount(supabase, socialAccountId, organizationId, scope);

  const { error } = await supabase.from("campaign_accounts").insert({
    campaign_id: campaignId,
    social_account_id: socialAccountId,
  });

  if (error) {
    if (error.code === "23505") {
      throw new CampaignValidationError("Account is already attached to this campaign.");
    }
    throw new Error(error.message);
  }
}

export async function detachCampaignAccount(
  supabase: SupabaseClient,
  organizationId: string,
  campaignId: string,
  socialAccountId: string,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<void> {
  await verifyCampaignOwnership(supabase, campaignId, organizationId, scope);

  const { error } = await supabase
    .from("campaign_accounts")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("social_account_id", socialAccountId);

  if (error) throw new Error(error.message);
}

export async function getCampaignPerformance(
  supabase: SupabaseClient,
  organizationId: string,
  campaignId: string,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<CampaignPerformance> {
  await verifyCampaignOwnership(supabase, campaignId, organizationId, scope);

  const { data: contentLinks } = await supabase
    .from("campaign_content")
    .select("content_id, content(id, headline)")
    .eq("campaign_id", campaignId);

  const contentIds = (contentLinks ?? []).map((link) => link.content_id as string);
  const contentMeta = (contentLinks ?? []).map((link) => {
    const content = link.content as { id?: string; headline?: string | null } | null;
    return {
      id: (content?.id ?? link.content_id) as string,
      headline: content?.headline ?? null,
    };
  });

  if (contentIds.length === 0) {
    return calculateCampaignPerformance({
      contentIds: [],
      contentMeta: [],
      analyticsRows: [],
    });
  }

  const { data: posts } = await supabase
    .from("scheduled_posts")
    .select("id, content_id, platform_post_id")
    .in("content_id", contentIds)
    .eq("status", "published")
    .not("platform_post_id", "is", null);

  const postIds = (posts ?? []).map((post) => post.id as string);
  const contentByPost = new Map<string, string>();
  for (const post of posts ?? []) {
    if (post.content_id) {
      contentByPost.set(post.id as string, post.content_id as string);
    }
  }

  if (postIds.length === 0) {
    return calculateCampaignPerformance({
      contentIds,
      contentMeta,
      analyticsRows: [],
    });
  }

  const { data: analytics } = await supabase
    .from("content_analytics")
    .select(
      "scheduled_post_id, platform, metric_date, impressions, reach, likes, comments, shares, saves, engagement_rate"
    )
    .eq("organization_id", organizationId)
    .in("scheduled_post_id", postIds);

  const analyticsRows = (analytics ?? []).map((row) => ({
    content_id: row.scheduled_post_id
      ? contentByPost.get(row.scheduled_post_id as string) ?? null
      : null,
    scheduled_post_id: row.scheduled_post_id as string | null,
    platform: row.platform as string,
    metric_date: row.metric_date as string,
    impressions: row.impressions as number | null,
    reach: row.reach as number | null,
    likes: row.likes as number | null,
    comments: row.comments as number | null,
    shares: row.shares as number | null,
    saves: row.saves as number | null,
    engagement_rate: row.engagement_rate as number | null,
  }));

  return calculateCampaignPerformance({
    contentIds,
    contentMeta,
    analyticsRows,
  });
}

export async function countActiveCampaigns(
  supabase: SupabaseClient,
  organizationId: string,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<number> {
  let query = supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "active");

  query = scopeCampaignQuery(query, scope);

  const { count, error } = await query;

  if (error) {
    if (error.code === "42P01") return 0;
    throw new Error(error.message);
  }

  return count ?? 0;
}
