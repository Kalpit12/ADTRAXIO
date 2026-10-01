import type { SocialAccountStatus, SocialPlatformType } from "./types";

export interface ConnectionStatusDisplay {
  label: string;
  description: string;
  tone: "ok" | "attention" | "muted";
}

const STATUS_DISPLAY: Record<SocialAccountStatus, ConnectionStatusDisplay> = {
  connected: {
    label: "Connected",
    description: "Ready for publishing and analytics",
    tone: "ok",
  },
  expired: {
    label: "Reconnect required",
    description: "Refresh this connection to continue using it",
    tone: "attention",
  },
  error: {
    label: "Connection error",
    description: "Something went wrong — try reconnecting",
    tone: "attention",
  },
  revoked: {
    label: "Disconnected",
    description: "This account was removed",
    tone: "muted",
  },
};

export function getConnectionStatusDisplay(
  status: SocialAccountStatus | string
): ConnectionStatusDisplay {
  return STATUS_DISPLAY[status as SocialAccountStatus] ?? {
    label: String(status),
    description: "",
    tone: "muted",
  };
}

export interface AccountCapability {
  id: string;
  label: string;
  available: boolean;
}

/** User-facing capabilities — only Meta platforms with real product support. */
export function getAccountCapabilities(
  platform: SocialPlatformType,
  status: SocialAccountStatus
): AccountCapability[] {
  const active = status === "connected";
  if (platform !== "facebook" && platform !== "instagram") {
    return [];
  }

  return [
    { id: "publishing", label: "Publishing", available: active },
    { id: "analytics", label: "Analytics", available: active },
    { id: "content", label: "Content Studio", available: active },
  ];
}

export function getReconnectHref(
  platform: SocialPlatformType
): string | null {
  if (platform === "facebook") {
    return "/api/social/meta/connect?target=facebook";
  }
  if (platform === "instagram") {
    return "/api/social/meta/connect?target=instagram";
  }
  return null;
}

export function friendlyConnectionMessage(
  message: string | null | undefined
): string {
  if (!message) {
    return "We couldn't complete the connection. Try again.";
  }

  const trimmed = message.trim();

  if (
    trimmed.includes("redirect URI") ||
    trimmed.includes("INSTAGRAM_REDIRECT") ||
    trimmed.includes("Authorization code") ||
    trimmed.includes("Invalid or expired connection session")
  ) {
    if (trimmed.includes("Connection cancelled")) {
      return "Connection cancelled.";
    }
    if (trimmed.includes("Invalid or expired connection session")) {
      return "This connection session expired. Start again from Connect account.";
    }
    return "We couldn't complete the connection. Try again or contact your administrator.";
  }

  if (
    trimmed.length > 160 ||
    /oauth|token|graph\.facebook|access_denied/i.test(trimmed)
  ) {
    return "We couldn't complete the connection. Try again.";
  }

  return trimmed;
}

export const CONNECT_PLATFORM_COPY: Record<
  "facebook" | "instagram",
  { title: string; lead: string; steps: string[] }
> = {
  facebook: {
    title: "Facebook Page",
    lead: "Connect a Page you manage to publish and view performance in ADTRAXIO.",
    steps: [
      "You'll sign in with Meta and choose a Page",
      "ADTRAXIO uses the connection only for publishing and analytics in this workspace",
    ],
  },
  instagram: {
    title: "Instagram",
    lead: "Connect a professional Instagram account linked to your Meta login.",
    steps: [
      "You'll sign in with Meta and confirm the Instagram account",
      "Publishing requires media for Instagram posts",
    ],
  },
};
