import { NextResponse } from "next/server";
import { handleStripeEvent, verifyStripeWebhook } from "@/lib/billing/webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();

  try {
    const event = await verifyStripeWebhook(payload, signature);
    await handleStripeEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
