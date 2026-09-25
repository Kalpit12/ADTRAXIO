export type SocialPlatformType =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "linkedin"
  | "youtube";

export type SocialAccountStatus = "connected" | "expired" | "revoked" | "error";

export type MetaConnectionTarget = "facebook" | "instagram";

export interface SafeSocialAccount {
  id: string;
  platform: SocialPlatformType;
  accountName: string | null;
  username: string | null;
  profileImageUrl: string | null;
  status: SocialAccountStatus;
  lastSyncedAt: string | null;
  updatedAt: string;
}

export interface DiscoveredAccount {
  selectionId: string;
  platform: "facebook" | "instagram";
  platformAccountId: string;
  accountName: string;
  username: string | null;
  profileImageUrl: string | null;
  pageAccessToken?: string;
}

export interface PendingConnectionPayload {
  target: MetaConnectionTarget;
  userAccessToken: string;
  tokenExpiresAt: string | null;
  scopes: string[];
  accounts: DiscoveredAccount[];
}

export interface SocialProvider {
  getAuthorizationUrl(input: {
    state: string;
    redirectUri: string;
  }): string;
  exchangeCode(input: {
    code: string;
    redirectUri: string;
  }): Promise<{
    accessToken: string;
    expiresIn: number | null;
    userId?: string;
  }>;
  discoverAccounts(input: {
    accessToken: string;
    userAccessToken?: string;
  }): Promise<DiscoveredAccount[]>;
  revokeAccess?(accessToken: string): Promise<void>;
}
