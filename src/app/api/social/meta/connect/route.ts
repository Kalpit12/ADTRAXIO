import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import {
  getMetaRedirectUri,
  isMetaTargetConfigured,
} from "@/lib/social/config";
import { createOAuthState } from "@/lib/social/oauth-state";
import { getMetaProvider } from "@/lib/social/providers";
import type { MetaConnectionTarget } from "@/lib/social/types";

export async function GET(request: Request) {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    if (auth.status === 401) {
      return NextResponse.redirect(
        new URL("/login?redirect=/social", request.url)
      );
    }
    return NextResponse.redirect(
      new URL(
        `/social?error=${encodeURIComponent(auth.error)}`,
        request.url
      )
    );
  }

  const { searchParams } = new URL(request.url);
  const targetParam = searchParams.get("target");
  const target: MetaConnectionTarget =
    targetParam === "instagram" ? "instagram" : "facebook";

  if (!isMetaTargetConfigured(target)) {
    return NextResponse.redirect(
      new URL(
        `/social?error=${encodeURIComponent("Meta connection isn't configured yet.")}`,
        request.url
      )
    );
  }

  const redirectUri = getMetaRedirectUri(target);
  if (!redirectUri) {
    const message =
      target === "instagram"
        ? "Instagram requires an HTTPS redirect URI. Set INSTAGRAM_REDIRECT_URI to your tunnel URL."
        : "Meta redirect URI is not configured.";
    return NextResponse.redirect(
      new URL(`/social?error=${encodeURIComponent(message)}`, request.url)
    );
  }

  const state = await createOAuthState({
    userId: auth.user.id,
    organizationId: auth.organizationId,
    target,
    redirectUri,
  });

  const provider = getMetaProvider(target);
  const authorizationUrl = provider.getAuthorizationUrl({ state, redirectUri });

  return NextResponse.redirect(authorizationUrl);
}
