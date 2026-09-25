export type PublishingPlatform = "facebook" | "instagram";

export type PublishingStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled";

export type PublishingMediaType = "image" | "video";

export interface PlatformCapabilities {
  supportsText: boolean;
  supportsImage: boolean;
  supportsVideo: boolean;
  supportsScheduling: boolean;
  requiresMedia: boolean;
}

export interface PublishPayload {
  caption: string;
  mediaType?: PublishingMediaType | null;
  mediaUrl?: string | null;
}

export interface PublishResult {
  platformPostId: string;
  publishedAt: string;
}

export interface ScheduledPostRecord {
  id: string;
  organizationId: string;
  createdBy: string;
  contentId: string | null;
  socialAccountId: string;
  platform: PublishingPlatform;
  scheduledFor: string | null;
  status: PublishingStatus;
  caption: string | null;
  mediaType: PublishingMediaType | null;
  mediaUrl: string | null;
  platformPostId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  publishedAt: string | null;
  timezone: string | null;
  createdAt: string;
  updatedAt: string;
  accountName?: string | null;
  accountUsername?: string | null;
}

export interface CreatePublishRequest {
  contentId?: string | null;
  socialAccountId: string;
  caption: string;
  mediaType?: PublishingMediaType | null;
  mediaUrl?: string | null;
  timezone?: string | null;
}

export interface SchedulePublishRequest extends CreatePublishRequest {
  scheduledFor: string;
  timezone: string;
}

export interface PublishingProvider {
  publishPost(input: {
    platformAccountId: string;
    accessToken: string;
    connectionTarget: "facebook" | "instagram";
    platform: PublishingPlatform;
    payload: PublishPayload;
  }): Promise<PublishResult>;
  validatePublishableAccount(input: {
    platform: PublishingPlatform;
    connectionTarget: "facebook" | "instagram";
    scopes: string[];
    status: string;
    tokenExpiresAt: string | null;
  }): { ok: true } | { ok: false; code: string; message: string };
}
