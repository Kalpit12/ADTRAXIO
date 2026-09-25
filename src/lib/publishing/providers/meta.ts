import { META_GRAPH_API_VERSION } from "@/lib/social/config";
import { PublishingError, normalizeMetaError } from "../errors";
import type {
  PublishPayload,
  PublishResult,
  PublishingPlatform,
  PublishingProvider,
} from "../types";

const API_HOST = {
  facebook: "https://graph.facebook.com",
  instagram: "https://graph.instagram.com",
} as const;

async function parseMetaResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & {
    error?: { message?: string; code?: number; error_subcode?: number };
  };

  if (!response.ok) {
    const message =
      payload.error?.message ??
      `Meta API request failed with status ${response.status}.`;
    throw new PublishingError("meta_api_error", message, response.status);
  }

  return payload;
}

function resolveHost(
  platform: PublishingPlatform,
  connectionTarget: "facebook" | "instagram"
): string {
  if (platform === "instagram" && connectionTarget === "instagram") {
    return API_HOST.instagram;
  }
  return API_HOST.facebook;
}

async function waitForInstagramContainer(
  host: string,
  containerId: string,
  accessToken: string
): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const params = new URLSearchParams({
      fields: "status_code",
      access_token: accessToken,
    });

    const response = await fetch(`${host}/${META_GRAPH_API_VERSION}/${containerId}?${params}`);
    const payload = await parseMetaResponse<{ status_code?: string }>(response);
    const status = payload.status_code;

    if (status === "FINISHED") return;
    if (status === "ERROR" || status === "EXPIRED") {
      throw new PublishingError(
        "invalid_media",
        "Instagram could not process the media container."
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  throw new PublishingError(
    "meta_api_error",
    "Instagram media processing timed out. Try again."
  );
}

export const metaPublishingProvider: PublishingProvider = {
  validatePublishableAccount(input) {
    if (input.status !== "connected") {
      return {
        ok: false,
        code: "account_disconnected",
        message: "This account is not connected.",
      };
    }

    if (input.tokenExpiresAt && new Date(input.tokenExpiresAt).getTime() < Date.now()) {
      return {
        ok: false,
        code: "account_expired",
        message: "This account token has expired. Reconnect the account.",
      };
    }

    const scopes = input.scopes ?? [];

    if (input.platform === "facebook") {
      if (!scopes.includes("pages_manage_posts")) {
        return {
          ok: false,
          code: "permission_denied",
          message:
            "Facebook publishing permission is missing. Reconnect the account with publish access.",
        };
      }
      return { ok: true };
    }

    if (input.connectionTarget === "instagram") {
      if (!scopes.includes("instagram_business_content_publish")) {
        return {
          ok: false,
          code: "permission_denied",
          message:
            "Instagram publishing permission is missing. Reconnect the account with publish access.",
        };
      }
      return { ok: true };
    }

    if (
      !scopes.includes("instagram_content_publish") &&
      !scopes.includes("instagram_business_content_publish")
    ) {
      return {
        ok: false,
        code: "permission_denied",
        message:
          "Instagram publishing permission is missing. Reconnect via Facebook with publish access.",
      };
    }

    return { ok: true };
  },

  async publishPost(input) {
    try {
      const host = resolveHost(input.platform, input.connectionTarget);
      const { accessToken, platformAccountId, payload, platform } = input;

      if (platform === "facebook") {
        return await publishFacebookPost(host, platformAccountId, accessToken, payload);
      }

      return await publishInstagramPost(host, platformAccountId, accessToken, payload);
    } catch (error) {
      throw normalizeMetaError(error);
    }
  },
};

async function publishFacebookPost(
  host: string,
  pageId: string,
  accessToken: string,
  payload: PublishPayload
): Promise<PublishResult> {
  const caption = payload.caption.trim();

  if (payload.mediaType === "image" && payload.mediaUrl) {
    const body = new URLSearchParams({
      url: payload.mediaUrl,
      caption,
      access_token: accessToken,
    });

    const response = await fetch(
      `${host}/${META_GRAPH_API_VERSION}/${pageId}/photos`,
      { method: "POST", body }
    );

    const result = await parseMetaResponse<{ id?: string; post_id?: string }>(response);
    const platformPostId = result.post_id ?? result.id;
    if (!platformPostId) {
      throw new PublishingError("meta_api_error", "Facebook did not return a post ID.");
    }

    return { platformPostId, publishedAt: new Date().toISOString() };
  }

  if (payload.mediaType === "video") {
    throw new PublishingError(
      "unsupported_content",
      "Video publishing is not available for this account yet.",
      400
    );
  }

  if (!caption) {
    throw new PublishingError("invalid_content", "Facebook posts require caption text.");
  }

  const body = new URLSearchParams({
    message: caption,
    access_token: accessToken,
  });

  const response = await fetch(
    `${host}/${META_GRAPH_API_VERSION}/${pageId}/feed`,
    { method: "POST", body }
  );

  const result = await parseMetaResponse<{ id?: string }>(response);
  if (!result.id) {
    throw new PublishingError("meta_api_error", "Facebook did not return a post ID.");
  }

  return { platformPostId: result.id, publishedAt: new Date().toISOString() };
}

async function publishInstagramPost(
  host: string,
  igUserId: string,
  accessToken: string,
  payload: PublishPayload
): Promise<PublishResult> {
  if (!payload.mediaUrl || payload.mediaType !== "image") {
    throw new PublishingError(
      "media_required",
      "Instagram publishing requires an image."
    );
  }

  const caption = payload.caption.trim();
  const containerBody = new URLSearchParams({
    image_url: payload.mediaUrl,
    caption,
    access_token: accessToken,
  });

  const containerResponse = await fetch(
    `${host}/${META_GRAPH_API_VERSION}/${igUserId}/media`,
    { method: "POST", body: containerBody }
  );

  const container = await parseMetaResponse<{ id?: string }>(containerResponse);
  if (!container.id) {
    throw new PublishingError("meta_api_error", "Instagram did not create a media container.");
  }

  await waitForInstagramContainer(host, container.id, accessToken);

  const publishBody = new URLSearchParams({
    creation_id: container.id,
    access_token: accessToken,
  });

  const publishResponse = await fetch(
    `${host}/${META_GRAPH_API_VERSION}/${igUserId}/media_publish`,
    { method: "POST", body: publishBody }
  );

  const published = await parseMetaResponse<{ id?: string }>(publishResponse);
  if (!published.id) {
    throw new PublishingError("meta_api_error", "Instagram did not return a published media ID.");
  }

  return { platformPostId: published.id, publishedAt: new Date().toISOString() };
}
