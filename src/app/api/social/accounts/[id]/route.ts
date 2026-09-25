import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import { getAccountAccessToken, disconnectAccount } from "@/lib/social/service";
import { getMetaProvider } from "@/lib/social/providers";
import type { SocialPlatformType } from "@/lib/social/types";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  const { id } = await context.params;

  try {
    const { data: account } = await auth.supabase
      .from("social_accounts")
      .select("platform, client_workspace_id")
      .eq("id", id)
      .eq("organization_id", auth.organizationId)
      .maybeSingle();

    if (account) {
      const rowClientId = account.client_workspace_id as string | null;
      const { isAgency, clientWorkspaceId } = auth.scope;
      if (!isAgency && rowClientId != null) {
        return NextResponse.json({ error: "Account not found." }, { status: 404 });
      }
      if (isAgency && clientWorkspaceId && rowClientId !== clientWorkspaceId) {
        return NextResponse.json({ error: "Account not found." }, { status: 404 });
      }
      if (isAgency && !clientWorkspaceId && rowClientId != null) {
        return NextResponse.json({ error: "Account not found." }, { status: 404 });
      }
    }

    if (account?.platform) {
      const token = await getAccountAccessToken(
        auth.supabase,
        id,
        auth.organizationId
      );
      if (token) {
        const platform = account.platform as SocialPlatformType;
        const target =
          platform === "instagram" ? "instagram" : "facebook";
        await getMetaProvider(target).revokeAccess?.(token);
      }
    }

    await disconnectAccount(auth.supabase, {
      accountId: id,
      organizationId: auth.organizationId,
      userId: auth.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to disconnect account.",
      },
      { status: 500 }
    );
  }
}
