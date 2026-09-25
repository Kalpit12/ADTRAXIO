import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/social/auth-context";
import { getBillingUsage } from "@/lib/billing/service";

export async function GET() {
  const auth = await requireAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const usage = await getBillingUsage(auth.supabase, auth.organizationId);
    return NextResponse.json({ usage });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load usage.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
