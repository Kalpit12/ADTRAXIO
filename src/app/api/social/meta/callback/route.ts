import { NextResponse } from "next/server";
import {
  META_FACEBOOK_SCOPES,
  META_INSTAGRAM_SCOPES,
} from "@/lib/social/config";
import { consumeOAuthState } from "@/lib/social/oauth-state";
import { getMetaProvider } from "@/lib/social/providers";
import { createClient } from "@/lib/supabase/server";
import {
  connectSingleAccount,
  savePendingConnection,
} from "@/lib/social/service";
import type { PendingConnectionPayload } from "@/lib/social/types";

function redirectWithMessage(
  request: Request,
  path: string,
  message: string,
  type = "error"
) {
  const url = new URL(path, request.url);
  url.searchParams.set(type, message);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");
  const oauthDescription = searchParams.get("error_description");

  if (oauthError) {
    const message =
      oauthError === "access_denied"
        ? "Connection cancelled."
        : "Unable to connect your Meta account.";
    return redirectWithMessage(request, "/social", message);
  }

  const oauthState = await consumeOAuthState(state);
  if (!oauthState) {
    return redirectWithMessage(
      request,
      "/social",
      "Invalid or expired connection session. Try again."
    );
  }

  if (!code) {
    return redirectWithMessage(request, "/social", "Authorization code missing.");
  }

  const redirectUri = oauthState.redirectUri;
  if (!redirectUri) {
    return redirectWithMessage(
      request,
      "/social",
      "Meta redirect URI is not configured."
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return redirectWithMessage(
      request,
      "/social",
      "Workspace is not configured."
    );
  }

  try {
    const provider = getMetaProvider(oauthState.target);
    const tokenResult = await provider.exchangeCode({ code, redirectUri });
    const accounts = await provider.discoverAccounts({
      accessToken: tokenResult.accessToken,
    });

    if (accounts.length === 0) {
      return redirectWithMessage(
        request,
        "/social",
        oauthState.target === "instagram"
          ? "No eligible Instagram professional account was found."
          : "No Facebook Pages were found for this account."
      );
    }

    const tokenExpiresAt =
      tokenResult.expiresIn != null
        ? new Date(Date.now() + tokenResult.expiresIn * 1000).toISOString()
        : null;

    const payload: PendingConnectionPayload = {
      target: oauthState.target,
      userAccessToken: tokenResult.accessToken,
      tokenExpiresAt,
      scopes:
        oauthState.target === "instagram"
          ? [...META_INSTAGRAM_SCOPES]
          : [...META_FACEBOOK_SCOPES],
      accounts,
    };

    if (accounts.length === 1) {
      await connectSingleAccount(supabase, {
        organizationId: oauthState.organizationId,
        userId: oauthState.userId,
        payload,
        account: accounts[0],
      });

      return redirectWithMessage(
        request,
        "/social",
        "Account connected successfully.",
        "success"
      );
    }

    const sessionId = await savePendingConnection(supabase, {
      organizationId: oauthState.organizationId,
      userId: oauthState.userId,
      target: oauthState.target,
      payload,
    });

    const selectUrl = new URL("/social/select", request.url);
    selectUrl.searchParams.set("session", sessionId);
    return NextResponse.redirect(selectUrl);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.includes("eligible")
          ? error.message
          : "Unable to complete Meta connection."
        : "Unable to complete Meta connection.";

    return redirectWithMessage(request, "/social", message);
  }
}
