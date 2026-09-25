import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/social/auth-context";
import { getPendingConnection } from "@/lib/social/service";

export async function GET(request: Request) {
  const auth = await requireAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session");
  if (!sessionId) {
    return NextResponse.json({ error: "Session is required." }, { status: 400 });
  }

  const payload = await getPendingConnection(
    auth.supabase,
    sessionId,
    auth.user.id
  );

  if (!payload) {
    return NextResponse.json(
      { error: "Connection session expired. Try again." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    target: payload.target,
    accounts: payload.accounts.map((account) => ({
      selectionId: account.selectionId,
      platform: account.platform,
      accountName: account.accountName,
      username: account.username,
      profileImageUrl: account.profileImageUrl,
    })),
  });
}
