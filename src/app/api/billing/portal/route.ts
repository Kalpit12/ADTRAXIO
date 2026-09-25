import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/social/auth-context";
import { BillingError } from "@/lib/billing/errors";
import { createPortalSession } from "@/lib/billing/service";

export async function POST() {
  const auth = await requireAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const session = await createPortalSession(
      auth.supabase,
      auth.organizationId
    );
    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    const message =
      error instanceof Error ? error.message : "Unable to open billing portal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
