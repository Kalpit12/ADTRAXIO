import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import { requireEntitlement } from "@/lib/billing/entitlements";
import { EntitlementError } from "@/lib/billing/errors";
import {
  generateIntelligence,
  InsufficientDataError,
  IntelligenceAIError,
  IntelligenceValidationError,
} from "@/lib/intelligence/service";

export async function POST(request: Request) {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  try {
    await requireEntitlement(
      auth.supabase,
      auth.organizationId,
      "growth_intelligence"
    );

    const body = (await request.json().catch(() => ({}))) as {
      campaignId?: string;
      preset?: "7d" | "30d" | "90d";
    };

    const result = await generateIntelligence(
      auth.supabase,
      auth.organizationId,
      {
        campaignId: body.campaignId ?? null,
        preset: body.preset ?? "30d",
        scope: auth.scope,
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof EntitlementError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof InsufficientDataError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof IntelligenceValidationError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (error instanceof IntelligenceAIError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message =
      error instanceof Error ? error.message : "Unable to generate insights.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
