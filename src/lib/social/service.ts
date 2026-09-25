import { encryptSecret, decryptSecret } from "@/lib/security/encryption";
import type { WorkspaceScope } from "@/lib/workspaces/scope";
import { LEGACY_WORKSPACE_SCOPE } from "@/lib/workspaces/scope";
import type { SupabaseClient } from "@supabase/supabase-js";

const EMPTY_CLIENT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

function scopeSocialQuery<T extends { is: (c: string, v: null) => T; eq: (c: string, v: string) => T }>(
  query: T,
  scope: WorkspaceScope
): T {
  if (!scope.isAgency) return query.is("client_workspace_id", null);
  if (scope.clientWorkspaceId) {
    return query.eq("client_workspace_id", scope.clientWorkspaceId);
  }
  return query.eq("client_workspace_id", EMPTY_CLIENT_WORKSPACE_ID);
}
import type {
  DiscoveredAccount,
  MetaConnectionTarget,
  PendingConnectionPayload,
  SafeSocialAccount,
  SocialAccountStatus,
  SocialPlatformType,
} from "./types";

type SocialAccountRow = {
  id: string;
  platform: string;
  account_name: string | null;
  username: string | null;
  profile_image_url: string | null;
  status: string;
  last_synced_at: string | null;
  updated_at: string;
};

const SAFE_ACCOUNT_FIELDS =
  "id, platform, account_name, username, profile_image_url, status, last_synced_at, updated_at";

function mapSafeAccount(row: SocialAccountRow): SafeSocialAccount {
  return {
    id: row.id,
    platform: row.platform as SocialPlatformType,
    accountName: row.account_name,
    username: row.username,
    profileImageUrl: row.profile_image_url,
    status: row.status as SocialAccountStatus,
    lastSyncedAt: row.last_synced_at,
    updatedAt: row.updated_at,
  };
}

export async function getConnectedAccounts(
  supabase: SupabaseClient,
  organizationId: string,
  scope: WorkspaceScope = LEGACY_WORKSPACE_SCOPE
): Promise<SafeSocialAccount[]> {
  let query = supabase
    .from("social_accounts")
    .select(SAFE_ACCOUNT_FIELDS)
    .eq("organization_id", organizationId)
    .neq("status", "revoked")
    .order("updated_at", { ascending: false });

  query = scopeSocialQuery(query, scope);

  const { data, error } = await query;

  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapSafeAccount(row as SocialAccountRow));
}

export async function savePendingConnection(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    userId: string;
    target: MetaConnectionTarget;
    payload: PendingConnectionPayload;
  }
): Promise<string> {
  const encrypted = encryptSecret(JSON.stringify(input.payload));
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("social_connection_pending")
    .insert({
      organization_id: input.organizationId,
      user_id: input.userId,
      platform_target: input.target,
      payload_encrypted: encrypted,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function getPendingConnection(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string
): Promise<PendingConnectionPayload | null> {
  const { data, error } = await supabase
    .from("social_connection_pending")
    .select("payload_encrypted, expires_at, user_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !data) return null;
  if (data.user_id !== userId) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  return JSON.parse(
    decryptSecret(data.payload_encrypted as string)
  ) as PendingConnectionPayload;
}

export async function deletePendingConnection(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string
) {
  await supabase
    .from("social_connection_pending")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId);
}

export async function connectSelectedAccounts(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    userId: string;
    payload: PendingConnectionPayload;
    selectedSelectionIds: string[];
    clientWorkspaceId?: string | null;
  }
): Promise<{ connected: SafeSocialAccount[]; skipped: string[] }> {
  const selected = input.payload.accounts.filter((account) =>
    input.selectedSelectionIds.includes(account.selectionId)
  );

  const connected: SafeSocialAccount[] = [];
  const skipped: string[] = [];

  for (const account of selected) {
    const tokenToStore =
      account.pageAccessToken ?? input.payload.userAccessToken;

    const record = {
      organization_id: input.organizationId,
      client_workspace_id: input.clientWorkspaceId ?? null,
      user_id: input.userId,
      platform: account.platform,
      platform_account_id: account.platformAccountId,
      account_name: account.accountName,
      username: account.username,
      profile_image_url: account.profileImageUrl,
      access_token_encrypted: encryptSecret(tokenToStore),
      refresh_token_encrypted: null,
      token_expires_at: input.payload.tokenExpiresAt,
      scopes: input.payload.scopes,
      status: "connected" as const,
      metadata: { connectionTarget: input.payload.target },
      last_synced_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("social_accounts")
      .upsert(record, {
        onConflict: "organization_id,platform,platform_account_id",
      })
      .select(SAFE_ACCOUNT_FIELDS)
      .single();

    if (error) {
      if (error.code === "23505") {
        skipped.push(account.accountName);
        continue;
      }
      throw new Error(error.message);
    }

    connected.push(mapSafeAccount(data as SocialAccountRow));
  }

  return { connected, skipped };
}

export async function connectSingleAccount(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    userId: string;
    payload: PendingConnectionPayload;
    account: DiscoveredAccount;
  }
): Promise<SafeSocialAccount> {
  const result = await connectSelectedAccounts(supabase, {
    organizationId: input.organizationId,
    userId: input.userId,
    payload: input.payload,
    selectedSelectionIds: [input.account.selectionId],
  });

  if (!result.connected[0]) {
    throw new Error("Unable to connect the selected account.");
  }

  return result.connected[0];
}

export async function disconnectAccount(
  supabase: SupabaseClient,
  input: {
    accountId: string;
    organizationId: string;
    userId: string;
  }
): Promise<void> {
  const { data, error } = await supabase
    .from("social_accounts")
    .select("id, access_token_encrypted, platform")
    .eq("id", input.accountId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Account not found.");

  const { error: deleteError } = await supabase
    .from("social_accounts")
    .delete()
    .eq("id", input.accountId)
    .eq("organization_id", input.organizationId);

  if (deleteError) throw new Error(deleteError.message);
}

export async function getAccountAccessToken(
  supabase: SupabaseClient,
  accountId: string,
  organizationId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("social_accounts")
    .select("access_token_encrypted")
    .eq("id", accountId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!data?.access_token_encrypted) return null;
  return decryptSecret(data.access_token_encrypted as string);
}
