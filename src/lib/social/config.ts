import type { MetaConnectionTarget } from "./types";

export const META_GRAPH_API_VERSION =
  process.env.META_GRAPH_API_VERSION?.trim() || "v21.0";

function buildCallbackUri(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/api/social/meta/callback`;
}

function getInstagramRedirectUri(): string | null {
  const explicit =
    process.env.META_INSTAGRAM_REDIRECT_URI?.trim() ||
    process.env.INSTAGRAM_REDIRECT_URI?.trim();
  if (explicit) return explicit;

  const instagramAppUrl = process.env.NEXT_PUBLIC_INSTAGRAM_APP_URL?.trim();
  if (instagramAppUrl) {
    return buildCallbackUri(instagramAppUrl);
  }

  // Instagram Business Login requires HTTPS redirect URIs Meta can reach.
  // Fall back to the shared Meta redirect only when it is already HTTPS.
  const shared = getFacebookRedirectUri();
  if (shared?.startsWith("https://")) return shared;

  return null;
}

function getFacebookRedirectUri(): string | null {
  const explicit = process.env.META_REDIRECT_URI?.trim();
  if (explicit) return explicit;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return buildCallbackUri(appUrl);
  }

  if (process.env.NODE_ENV !== "production") {
    return buildCallbackUri("http://localhost:3000");
  }

  return null;
}

export function getMetaRedirectUri(
  target: MetaConnectionTarget = "facebook"
): string | null {
  if (target === "instagram") {
    return getInstagramRedirectUri();
  }
  return getFacebookRedirectUri();
}

export function isMetaConfigured(): boolean {
  return Boolean(
    process.env.META_APP_ID?.trim() &&
      process.env.META_APP_SECRET?.trim() &&
      getMetaRedirectUri()
  );
}

function getInstagramAppId(): string | undefined {
  return (
    process.env.META_INSTAGRAM_APP_ID?.trim() ||
    process.env.INSTAGRAM_APP_ID?.trim()
  );
}

function getInstagramAppSecret(): string | undefined {
  return (
    process.env.META_INSTAGRAM_APP_SECRET?.trim() ||
    process.env.INSTAGRAM_APP_SECRET?.trim()
  );
}

export function isInstagramLoginConfigured(): boolean {
  const appId = getInstagramAppId();
  const appSecret = getInstagramAppSecret();
  const redirectUri = getMetaRedirectUri("instagram");

  return Boolean(appId && appSecret && redirectUri);
}

export function isMetaTargetConfigured(
  target: MetaConnectionTarget
): boolean {
  if (target === "instagram") {
    return isInstagramLoginConfigured() && isEncryptionConfiguredSafe();
  }
  return isMetaConfigured() && isEncryptionConfiguredSafe();
}

function isEncryptionConfiguredSafe(): boolean {
  try {
    const raw = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY?.trim();
    if (!raw) return false;
    return Buffer.from(raw, "base64").length === 32;
  } catch {
    return false;
  }
}

export function getMetaAppCredentials(target: MetaConnectionTarget): {
  appId: string;
  appSecret: string;
} | null {
  if (target === "instagram") {
    const appId = getInstagramAppId();
    const appSecret = getInstagramAppSecret();
    if (!appId || !appSecret) return null;
    return { appId, appSecret };
  }

  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  if (!appId || !appSecret) return null;
  return { appId, appSecret };
}

/** Meta scopes — connection + publishing (verified against Meta docs, Jan 2025+) */
export const META_FACEBOOK_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
] as const;

export const META_INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_insights",
] as const;
