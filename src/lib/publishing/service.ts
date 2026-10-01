import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceScope } from "@/lib/workspaces/scope";
import { LEGACY_WORKSPACE_SCOPE } from "@/lib/workspaces/scope";

const EMPTY_CLIENT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

function scopePublishingQuery<
  T extends { is: (c: string, v: null) => T; eq: (c: string, v: string) => T },
>(query: T, scope: WorkspaceScope): T {
  if (!scope.isAgency) return query.is("client_workspace_id", null);
  if (scope.clientWorkspaceId) {
    return query.eq("client_workspace_id", scope.clientWorkspaceId);
  }
  return query.eq("client_workspace_id", EMPTY_CLIENT_WORKSPACE_ID);
}
import { assertContentApprovedForPublishing } from "@/lib/collaboration/content-approvals";
import { CollaborationError } from "@/lib/collaboration/errors";
import { getAccountAccessToken } from "@/lib/social/service";
import { getPlatformCapabilities } from "./capabilities";
import { PublishingError, toClientError } from "./errors";
import { metaPublishingProvider } from "./providers/meta";
import { stageAiMediaAssetForPublishing } from "./stage-ai-asset";
import { verifyPublishMediaAssetForContent } from "./verify-content-media";
import type {
  CreatePublishRequest,
  PublishPayload,
  PublishingMediaType,
  PublishingPlatform,
  PublishingStatus,
  SchedulePublishRequest,
  ScheduledPostRecord,
} from "./types";

type ScheduledPostRow = {
  id: string;
  organization_id: string;
  created_by: string;
  content_id: string | null;
  social_account_id: string;
  platform: string;
  scheduled_for: string | null;
  status: string;
  caption: string | null;
  media_type: string | null;
  media_url: string | null;
  platform_post_id: string | null;
  error_code: string | null;
  error_message: string | null;
  published_at: string | null;
  timezone: string | null;
  created_at: string;
  updated_at: string;
  social_accounts?: {
    account_name: string | null;
    username: string | null;
  } | null;
};

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

function mapRow(row: ScheduledPostRow): ScheduledPostRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    contentId: row.content_id,
    socialAccountId: row.social_account_id,
    platform: row.platform as PublishingPlatform,
    scheduledFor: row.scheduled_for,
    status: row.status as PublishingStatus,
    caption: row.caption,
    mediaType: (row.media_type as PublishingMediaType | null) ?? null,
    mediaUrl: row.media_url,
    platformPostId: row.platform_post_id,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    publishedAt: row.published_at,
    timezone: row.timezone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    accountName: row.social_accounts?.account_name ?? null,
    accountUsername: row.social_accounts?.username ?? null,
  };
}

async function loadSocialAccount(
  supabase: SupabaseClient,
  organizationId: string,
  socialAccountId: string,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<SocialAccountRow> {
  let query = supabase
    .from("social_accounts")
    .select(
      "id, organization_id, platform, platform_account_id, account_name, username, status, scopes, token_expires_at, metadata"
    )
    .eq("id", socialAccountId)
    .eq("organization_id", organizationId);

  query = scopePublishingQuery(query, scope);

  const { data, error } = await query.maybeSingle();

  if (error) throw new PublishingError("database_error", error.message, 500);
  if (!data) {
    throw new PublishingError("account_not_found", "Social account not found.", 404);
  }

  return data as SocialAccountRow;
}

function getConnectionTarget(account: SocialAccountRow): "facebook" | "instagram" {
  const target = account.metadata?.connectionTarget;
  if (target === "instagram") return "instagram";
  return "facebook";
}

function validatePayloadForPlatform(
  platform: PublishingPlatform,
  payload: PublishPayload
): void {
  const capabilities = getPlatformCapabilities(platform);
  const caption = payload.caption?.trim() ?? "";

  if (capabilities.requiresMedia && !payload.mediaUrl) {
    throw new PublishingError(
      "media_required",
      "Instagram publishing requires media."
    );
  }

  if (payload.mediaType === "video" && !capabilities.supportsVideo) {
    throw new PublishingError(
      "unsupported_content",
      "Video publishing is not available for this account yet."
    );
  }

  if (!payload.mediaUrl && !caption && platform === "facebook") {
    throw new PublishingError("invalid_content", "Add caption text or media to publish.");
  }

  if (payload.mediaType === "image" && !payload.mediaUrl) {
    throw new PublishingError("media_required", "Image publishing requires uploaded media.");
  }
}

async function resolveCaptionFromContent(
  supabase: SupabaseClient,
  organizationId: string,
  contentId: string | null | undefined,
  fallbackCaption: string
): Promise<string> {
  if (!contentId) return fallbackCaption.trim();

  const { data, error } = await supabase
    .from("content")
    .select("caption, hashtags, primary_copy")
    .eq("id", contentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) return fallbackCaption.trim();

  const hashtags = Array.isArray(data.hashtags)
    ? (data.hashtags as string[])
        .map((tag) => `#${String(tag).replace(/^#/, "")}`)
        .join(" ")
    : "";

  const parts = [
    (data.caption as string | null)?.trim(),
    (data.primary_copy as string | null)?.trim(),
    hashtags.trim(),
  ].filter(Boolean);

  if (parts.length === 0) return fallbackCaption.trim();
  return parts.join("\n\n");
}

async function executePublish(
  supabase: SupabaseClient,
  postId: string,
  organizationId: string
): Promise<ScheduledPostRecord> {
  const { data: post, error } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("id", postId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !post) {
    throw new PublishingError("post_not_found", "Publishing record not found.", 404);
  }

  if (post.content_id) {
    try {
      await assertContentApprovedForPublishing(
        supabase,
        post.content_id as string,
        organizationId
      );
    } catch (error) {
      if (error instanceof CollaborationError) {
        throw new PublishingError(error.code, error.message, error.status);
      }
      throw error;
    }
  }

  const account = await loadSocialAccount(
    supabase,
    organizationId,
    post.social_account_id as string
  );

  const platform = account.platform as PublishingPlatform;
  if (platform !== "facebook" && platform !== "instagram") {
    throw new PublishingError(
      "unsupported_platform",
      "Only Facebook and Instagram publishing are supported.",
      400
    );
  }

  const connectionTarget = getConnectionTarget(account);
  const validation = metaPublishingProvider.validatePublishableAccount({
    platform,
    connectionTarget,
    scopes: account.scopes ?? [],
    status: account.status,
    tokenExpiresAt: account.token_expires_at,
  });

  if (!validation.ok) {
    throw new PublishingError(validation.code, validation.message, 403);
  }

  const payload: PublishPayload = {
    caption: (post.caption as string | null) ?? "",
    mediaType: (post.media_type as PublishingMediaType | null) ?? null,
    mediaUrl: (post.media_url as string | null) ?? null,
  };

  validatePayloadForPlatform(platform, payload);

  const accessToken = await getAccountAccessToken(
    supabase,
    account.id,
    organizationId
  );

  if (!accessToken) {
    throw new PublishingError(
      "token_invalid",
      "Unable to decrypt account credentials. Reconnect the account.",
      403
    );
  }

  const result = await metaPublishingProvider.publishPost({
    platform,
    platformAccountId: account.platform_account_id,
    accessToken,
    connectionTarget,
    payload,
  });

  const { data: updated, error: updateError } = await supabase
    .from("scheduled_posts")
    .update({
      status: "published",
      platform_post_id: result.platformPostId,
      published_at: result.publishedAt,
      error_code: null,
      error_message: null,
    })
    .eq("id", postId)
    .eq("organization_id", organizationId)
    .select("*")
    .single();

  if (updateError) {
    throw new PublishingError("database_error", updateError.message, 500);
  }

  return mapRow(updated as ScheduledPostRow);
}

export async function createScheduledPostRecord(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    userId: string;
    request: CreatePublishRequest | SchedulePublishRequest;
    status: Extract<PublishingStatus, "scheduled" | "draft">;
    scheduledFor?: string | null;
    timezone?: string | null;
    scope?: WorkspaceScope;
  }
): Promise<ScheduledPostRecord> {
  const scope = input.scope ?? LEGACY_WORKSPACE_SCOPE;
  const account = await loadSocialAccount(
    supabase,
    input.organizationId,
    input.request.socialAccountId,
    scope
  );

  const platform = account.platform as PublishingPlatform;
  if (platform !== "facebook" && platform !== "instagram") {
    throw new PublishingError(
      "unsupported_platform",
      "Only Facebook and Instagram publishing are supported.",
      400
    );
  }

  const connectionTarget = getConnectionTarget(account);
  const validation = metaPublishingProvider.validatePublishableAccount({
    platform,
    connectionTarget,
    scopes: account.scopes ?? [],
    status: account.status,
    tokenExpiresAt: account.token_expires_at,
  });

  if (!validation.ok) {
    throw new PublishingError(validation.code, validation.message, 403);
  }

  const caption = await resolveCaptionFromContent(
    supabase,
    input.organizationId,
    input.request.contentId,
    input.request.caption
  );

  if (input.request.mediaAssetId && !input.request.contentId) {
    throw new PublishingError(
      "invalid_content",
      "Saved content is required to publish AI-generated media.",
      400
    );
  }

  if (input.request.contentId) {
    try {
      await assertContentApprovedForPublishing(
        supabase,
        input.request.contentId,
        input.organizationId
      );
    } catch (error) {
      if (error instanceof CollaborationError) {
        throw new PublishingError(error.code, error.message, error.status);
      }
      throw error;
    }
  }

  let mediaType = input.request.mediaType ?? null;
  let mediaUrl = input.request.mediaUrl ?? null;

  if (input.request.mediaAssetId) {
    await verifyPublishMediaAssetForContent(
      supabase,
      input.request.contentId as string,
      input.organizationId,
      input.request.mediaAssetId
    );
    const staged = await stageAiMediaAssetForPublishing(supabase, {
      assetId: input.request.mediaAssetId,
      organizationId: input.organizationId,
      clientWorkspaceId: scope.isAgency ? scope.clientWorkspaceId : null,
    });
    mediaType = staged.mediaType;
    mediaUrl = staged.mediaUrl;
  }

  const payload: PublishPayload = {
    caption,
    mediaType,
    mediaUrl,
  };

  validatePayloadForPlatform(platform, payload);

  const { data, error } = await supabase
    .from("scheduled_posts")
    .insert({
      organization_id: input.organizationId,
      client_workspace_id: scope.isAgency ? scope.clientWorkspaceId : null,
      created_by: input.userId,
      content_id: input.request.contentId ?? null,
      social_account_id: input.request.socialAccountId,
      platform,
      scheduled_for: input.scheduledFor ?? null,
      status: input.status,
      caption,
      media_type: mediaType,
      media_url: mediaUrl,
      timezone: input.timezone ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new PublishingError("database_error", error.message, 500);
  }

  return mapRow(data as ScheduledPostRow);
}

export async function publishNow(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    userId: string;
    request: CreatePublishRequest;
    scope?: WorkspaceScope;
  }
): Promise<ScheduledPostRecord> {
  const record = await createScheduledPostRecord(supabase, {
    organizationId: input.organizationId,
    userId: input.userId,
    request: input.request,
    status: "draft",
    scope: input.scope,
  });

  await supabase
    .from("scheduled_posts")
    .update({ status: "publishing" })
    .eq("id", record.id)
    .eq("organization_id", input.organizationId);

  try {
    return await executePublish(supabase, record.id, input.organizationId);
  } catch (error) {
    const clientError = toClientError(error);
    await supabase
      .from("scheduled_posts")
      .update({
        status: "failed",
        error_code: clientError.code,
        error_message: clientError.message,
      })
      .eq("id", record.id)
      .eq("organization_id", input.organizationId);

    throw error;
  }
}

export async function schedulePost(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    userId: string;
    request: SchedulePublishRequest;
    scope?: WorkspaceScope;
  }
): Promise<ScheduledPostRecord> {
  return createScheduledPostRecord(supabase, {
    organizationId: input.organizationId,
    userId: input.userId,
    request: input.request,
    status: "scheduled",
    scheduledFor: input.request.scheduledFor,
    timezone: input.request.timezone,
    scope: input.scope,
  });
}

export async function listPublishingPosts(
  supabase: SupabaseClient,
  organizationId: string,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<ScheduledPostRecord[]> {
  let query = supabase
    .from("scheduled_posts")
    .select("*, social_accounts(account_name, username)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  query = scopePublishingQuery(query, scope);

  const { data, error } = await query;

  if (error) {
    if (error.code === "42P01") return [];
    throw new PublishingError("database_error", error.message, 500);
  }

  return (data ?? []).map((row) => mapRow(row as ScheduledPostRow));
}

export async function getPublishingPost(
  supabase: SupabaseClient,
  organizationId: string,
  postId: string
): Promise<ScheduledPostRecord | null> {
  const { data, error } = await supabase
    .from("scheduled_posts")
    .select("*, social_accounts(account_name, username)")
    .eq("id", postId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    throw new PublishingError("database_error", error.message, 500);
  }

  return data ? mapRow(data as ScheduledPostRow) : null;
}

export async function cancelScheduledPost(
  supabase: SupabaseClient,
  organizationId: string,
  postId: string
): Promise<ScheduledPostRecord> {
  const { data, error } = await supabase
    .from("scheduled_posts")
    .update({ status: "cancelled" })
    .eq("id", postId)
    .eq("organization_id", organizationId)
    .eq("status", "scheduled")
    .select("*")
    .single();

  if (error || !data) {
    throw new PublishingError(
      "invalid_state",
      "Only scheduled posts can be cancelled.",
      400
    );
  }

  return mapRow(data as ScheduledPostRow);
}

export async function retryFailedPost(
  supabase: SupabaseClient,
  organizationId: string,
  postId: string
): Promise<ScheduledPostRecord> {
  const { data: existing, error } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("id", postId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !existing) {
    throw new PublishingError("post_not_found", "Publishing record not found.", 404);
  }

  if (existing.status !== "failed") {
    throw new PublishingError(
      "invalid_state",
      "Only failed posts can be retried.",
      400
    );
  }

  await supabase
    .from("scheduled_posts")
    .update({
      status: "publishing",
      error_code: null,
      error_message: null,
    })
    .eq("id", postId)
    .eq("organization_id", organizationId);

  try {
    return await executePublish(supabase, postId, organizationId);
  } catch (error) {
    const clientError = toClientError(error);
    await supabase
      .from("scheduled_posts")
      .update({
        status: "failed",
        error_code: clientError.code,
        error_message: clientError.message,
      })
      .eq("id", postId)
      .eq("organization_id", organizationId);

    throw error;
  }
}

export async function processDueScheduledPosts(
  supabase: SupabaseClient,
  batchSize = 10
): Promise<{ processed: number; published: number; failed: number }> {
  const now = new Date().toISOString();

  const { data: duePosts, error } = await supabase
    .from("scheduled_posts")
    .select("id, organization_id")
    .eq("status", "scheduled")
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(batchSize);

  if (error) {
    throw new PublishingError("database_error", error.message, 500);
  }

  let published = 0;
  let failed = 0;

  for (const post of duePosts ?? []) {
    const { data: claimed } = await supabase
      .from("scheduled_posts")
      .update({ status: "publishing" })
      .eq("id", post.id)
      .eq("organization_id", post.organization_id)
      .eq("status", "scheduled")
      .select("id")
      .maybeSingle();

    if (!claimed) continue;

    try {
      await executePublish(supabase, post.id, post.organization_id as string);
      published += 1;
    } catch (error) {
      failed += 1;
      const clientError = toClientError(error);
      await supabase
        .from("scheduled_posts")
        .update({
          status: "failed",
          error_code: clientError.code,
          error_message: clientError.message,
        })
        .eq("id", post.id)
        .eq("organization_id", post.organization_id);
    }
  }

  return {
    processed: (duePosts ?? []).length,
    published,
    failed,
  };
}

export async function listUpcomingPosts(
  supabase: SupabaseClient,
  organizationId: string,
  limit = 5,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<ScheduledPostRecord[]> {
  let query = supabase
    .from("scheduled_posts")
    .select("*, social_accounts(account_name, username)")
    .eq("organization_id", organizationId)
    .eq("status", "scheduled")
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  query = scopePublishingQuery(query, scope);

  const { data, error } = await query;

  if (error) {
    if (error.code === "42P01") return [];
    throw new PublishingError("database_error", error.message, 500);
  }

  return (data ?? []).map((row) => mapRow(row as ScheduledPostRow));
}
