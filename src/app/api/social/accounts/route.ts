import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import { isMetaConfigured, isInstagramLoginConfigured } from "@/lib/social/config";
import { isEncryptionConfigured } from "@/lib/security/encryption";
import { getConnectedAccounts } from "@/lib/social/service";

export async function GET() {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  try {
    const accounts = await getConnectedAccounts(
      auth.supabase,
      auth.organizationId,
      auth.scope
    );

    return NextResponse.json({
      accounts,
      configuration: {
        metaFacebook: isMetaConfigured() && isEncryptionConfigured(),
        metaInstagram:
          isInstagramLoginConfigured() && isEncryptionConfigured(),
        encryption: isEncryptionConfigured(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load social accounts.",
      },
      { status: 500 }
    );
  }
}
