import {
  META_INSTAGRAM_SCOPES,
  getMetaAppCredentials,
} from "@/lib/social/config";
import type { DiscoveredAccount, SocialProvider } from "@/lib/social/types";

export const metaInstagramProvider: SocialProvider = {
  getAuthorizationUrl({ state, redirectUri }) {
    const creds = getMetaAppCredentials("instagram");
    if (!creds) {
      throw new Error("Meta Instagram connection is not configured.");
    }

    const params = new URLSearchParams({
      client_id: creds.appId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: META_INSTAGRAM_SCOPES.join(","),
      state,
    });

    // api.instagram.com is the documented authorize host; www.instagram.com can
    // redirect to /oauth/authorize/third_party/ when the wrong App ID is used.
    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  },

  async exchangeCode({ code, redirectUri }) {
    const creds = getMetaAppCredentials("instagram");
    if (!creds) {
      throw new Error("Meta Instagram connection is not configured.");
    }

    const body = new FormData();
    body.set("client_id", creds.appId);
    body.set("client_secret", creds.appSecret);
    body.set("grant_type", "authorization_code");
    body.set("redirect_uri", redirectUri);
    body.set("code", code);

    const response = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      body,
    });

    if (!response.ok) {
      throw new Error("Unable to exchange Instagram authorization code.");
    }

    const payload = (await response.json()) as {
      access_token?: string;
      user_id?: string | number;
      expires_in?: number;
    };

    if (!payload.access_token) {
      throw new Error("Instagram did not return an access token.");
    }

    let accessToken = payload.access_token;
    let expiresIn = payload.expires_in ?? null;

    const longLived = await exchangeInstagramLongLivedToken(
      accessToken,
      creds.appSecret
    );
    if (longLived) {
      accessToken = longLived.accessToken;
      expiresIn = longLived.expiresIn;
    }

    return {
      accessToken,
      expiresIn,
      userId: payload.user_id ? String(payload.user_id) : undefined,
    };
  },

  async discoverAccounts({ accessToken }) {
    const params = new URLSearchParams({
      fields: "user_id,username,name,profile_picture_url,account_type",
      access_token: accessToken,
    });

    const response = await fetch(
      `https://graph.instagram.com/me?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error("Unable to retrieve Instagram account profile.");
    }

    const profile = (await response.json()) as {
      user_id?: string;
      id?: string;
      username?: string;
      name?: string;
      profile_picture_url?: string;
      account_type?: string;
    };

    const accountId = profile.user_id ?? profile.id;
    if (!accountId) {
      throw new Error("Instagram account profile is missing an account ID.");
    }

    if (
      profile.account_type &&
      !profile.account_type.toLowerCase().includes("business") &&
      !profile.account_type.toLowerCase().includes("creator")
    ) {
      throw new Error(
        "This Instagram account isn't eligible for this connection."
      );
    }

    return [
      {
        selectionId: `instagram:${accountId}`,
        platform: "instagram",
        platformAccountId: accountId,
        accountName: profile.name ?? profile.username ?? "Instagram account",
        username: profile.username
          ? `@${profile.username.replace(/^@/, "")}`
          : null,
        profileImageUrl: profile.profile_picture_url ?? null,
        pageAccessToken: accessToken,
      },
    ];
  },

  async revokeAccess(accessToken) {
    const params = new URLSearchParams({
      access_token: accessToken,
    });

    await fetch(
      `https://graph.instagram.com/me/permissions?${params.toString()}`,
      { method: "DELETE" }
    ).catch(() => undefined);
  },
};

async function exchangeInstagramLongLivedToken(
  shortLivedToken: string,
  clientSecret: string
): Promise<{ accessToken: string; expiresIn: number | null } | null> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: clientSecret,
    access_token: shortLivedToken,
  });

  const response = await fetch(
    `https://graph.instagram.com/access_token?${params.toString()}`
  );

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token) return null;

  return {
    accessToken: payload.access_token,
    expiresIn: payload.expires_in ?? null,
  };
}
