import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { signPayload, verifySignedPayload } from "@/lib/security/encryption";
import type { MetaConnectionTarget } from "./types";

const OAUTH_STATE_COOKIE = "adly_meta_oauth_state";
const STATE_TTL_MS = 10 * 60 * 1000;

interface OAuthStatePayload {
  state: string;
  userId: string;
  organizationId: string;
  target: MetaConnectionTarget;
  redirectUri: string;
  exp: number;
}

export async function createOAuthState(input: {
  userId: string;
  organizationId: string;
  target: MetaConnectionTarget;
  redirectUri: string;
}): Promise<string> {
  const payload: OAuthStatePayload = {
    state: randomUUID(),
    userId: input.userId,
    organizationId: input.organizationId,
    target: input.target,
    redirectUri: input.redirectUri,
    exp: Date.now() + STATE_TTL_MS,
  };

  const signed = signPayload(JSON.stringify(payload));
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_TTL_MS / 1000,
  });

  return payload.state;
}

export async function consumeOAuthState(
  state: string | null
): Promise<OAuthStatePayload | null> {
  if (!state) return null;

  const cookieStore = await cookies();
  const signed = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);

  if (!signed) return null;

  const verified = verifySignedPayload(signed);
  if (!verified) return null;

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(verified) as OAuthStatePayload;
  } catch {
    return null;
  }

  if (payload.state !== state) return null;
  if (payload.exp < Date.now()) return null;

  return payload;
}
