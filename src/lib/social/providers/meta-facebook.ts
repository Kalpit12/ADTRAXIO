import {
  META_FACEBOOK_SCOPES,
  META_GRAPH_API_VERSION,
  getMetaAppCredentials,
} from "@/lib/social/config";
import type { DiscoveredAccount, SocialProvider } from "@/lib/social/types";

interface FacebookPage {
  id: string;
  name: string;
  access_token?: string;
  picture?: { data?: { url?: string } };
  instagram_business_account?: {
    id: string;
    username?: string;
    name?: string;
    profile_picture_url?: string;
  };
}

export const metaFacebookProvider: SocialProvider = {
  getAuthorizationUrl({ state, redirectUri }) {
    const creds = getMetaAppCredentials("facebook");
    if (!creds) {
      throw new Error("Meta Facebook connection is not configured.");
    }

    const params = new URLSearchParams({
      client_id: creds.appId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: META_FACEBOOK_SCOPES.join(","),
      state,
    });

    return `https://www.facebook.com/${META_GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
  },

  async exchangeCode({ code, redirectUri }) {
    const creds = getMetaAppCredentials("facebook");
    if (!creds) {
      throw new Error("Meta Facebook connection is not configured.");
    }

    const params = new URLSearchParams({
      client_id: creds.appId,
      client_secret: creds.appSecret,
      redirect_uri: redirectUri,
      code,
    });

    const response = await fetch(
      `https://graph.facebook.com/${META_GRAPH_API_VERSION}/oauth/access_token?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error("Unable to exchange Meta authorization code.");
    }

    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!payload.access_token) {
      throw new Error("Meta did not return an access token.");
    }

    return {
      accessToken: payload.access_token,
      expiresIn: payload.expires_in ?? null,
    };
  },

  async discoverAccounts({ accessToken }) {
    const params = new URLSearchParams({
      fields:
        "id,name,access_token,picture{url},instagram_business_account{id,username,name,profile_picture_url}",
      access_token: accessToken,
    });

    const response = await fetch(
      `https://graph.facebook.com/${META_GRAPH_API_VERSION}/me/accounts?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error("Unable to retrieve Facebook Pages from Meta.");
    }

    const payload = (await response.json()) as { data?: FacebookPage[] };
    const pages = payload.data ?? [];
    const accounts: DiscoveredAccount[] = [];

    for (const page of pages) {
      accounts.push({
        selectionId: `facebook:${page.id}`,
        platform: "facebook",
        platformAccountId: page.id,
        accountName: page.name,
        username: null,
        profileImageUrl: page.picture?.data?.url ?? null,
        pageAccessToken: page.access_token,
      });

      const ig = page.instagram_business_account;
      if (ig?.id) {
        accounts.push({
          selectionId: `instagram:${ig.id}`,
          platform: "instagram",
          platformAccountId: ig.id,
          accountName: ig.name ?? ig.username ?? "Instagram account",
          username: ig.username ? `@${ig.username.replace(/^@/, "")}` : null,
          profileImageUrl: ig.profile_picture_url ?? null,
          pageAccessToken: page.access_token,
        });
      }
    }

    return accounts;
  },

  async revokeAccess(accessToken) {
    const creds = getMetaAppCredentials("facebook");
    if (!creds) return;

    const params = new URLSearchParams({
      access_token: accessToken,
    });

    await fetch(
      `https://graph.facebook.com/${META_GRAPH_API_VERSION}/me/permissions?${params.toString()}`,
      { method: "DELETE" }
    ).catch(() => undefined);
  },
};
