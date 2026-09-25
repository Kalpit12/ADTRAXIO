import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/social/auth-context";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { getSubscriptionForOrganization } from "@/lib/billing/subscription-read";

export async function GET() {
  const auth = await requireAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const subscription = await getSubscriptionForOrganization(
      auth.supabase,
      auth.organizationId
    );

    return NextResponse.json({
      subscription,
      billingAvailable: isStripeConfigured(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load subscription.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
