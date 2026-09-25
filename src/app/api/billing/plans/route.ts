import { NextResponse } from "next/server";
import { getPublicPlans } from "@/lib/billing/plans";
import { isStripeConfigured } from "@/lib/billing/stripe";

export async function GET() {
  return NextResponse.json({
    plans: getPublicPlans(),
    currency: "KES",
    billingAvailable: isStripeConfigured(),
  });
}
