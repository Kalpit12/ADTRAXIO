import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/social/auth-context";
import { BillingError, EntitlementError } from "@/lib/billing/errors";
import { parsePlanIdentifier } from "@/lib/billing/plans";
import { createCheckoutSession } from "@/lib/billing/service";

export async function POST(request: Request) {
  const auth = await requireAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as { plan?: string };
    const plan = parsePlanIdentifier(body.plan);

    if (!plan) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    const session = await createCheckoutSession({
      supabase: auth.supabase,
      organizationId: auth.organizationId,
      userEmail: auth.user.email,
      plan,
    });

    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    if (error instanceof EntitlementError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Unable to start checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
