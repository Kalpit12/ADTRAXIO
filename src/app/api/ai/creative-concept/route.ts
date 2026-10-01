import { NextResponse } from "next/server";
import { generateCreativeConcept } from "@/lib/ai/creative-concept";
import {
  AIGenerationError,
  AIConfigurationError,
  isOpenAIConfigured,
} from "@/lib/ai/generate-content";
import { checkLimit } from "@/lib/billing/entitlements";
import { EntitlementError } from "@/lib/billing/errors";
import { recordUsageEvent } from "@/lib/billing/service";
import { validateCreativeBrief } from "@/lib/content/validation";
import type { CreativeBrief } from "@/lib/content/types";
import { requireAuthContext } from "@/lib/social/auth-context";

export async function GET() {
  return NextResponse.json({ configured: isOpenAIConfigured() });
}

export async function POST(request: Request) {
  const auth = await requireAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const brief =
    body && typeof body === "object" && "brief" in body
      ? (body as { brief: CreativeBrief }).brief
      : null;

  if (!brief) {
    return NextResponse.json({ error: "Brief is required." }, { status: 400 });
  }

  const errors = validateCreativeBrief(brief);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Brief is incomplete.", fields: errors }, {
      status: 400,
    });
  }

  try {
    const monthStart = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
    ).toISOString();

    const { count } = await auth.supabase
      .from("billing_usage_events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", auth.organizationId)
      .eq("metric", "ai_generation")
      .gte("created_at", monthStart);

    await checkLimit(
      auth.supabase,
      auth.organizationId,
      "ai_generation",
      count ?? 0
    );

    const concept = await generateCreativeConcept(brief);
    await recordUsageEvent(auth.organizationId, "ai_generation");

    return NextResponse.json({ concept });
  } catch (error) {
    if (error instanceof EntitlementError) {
      return NextResponse.json(
        { error: error.message, code: "PLAN_LIMIT" },
        { status: error.status }
      );
    }
    if (error instanceof AIConfigurationError) {
      return NextResponse.json(
        { error: error.message, code: "AI_NOT_CONFIGURED" },
        { status: 503 }
      );
    }
    if (error instanceof AIGenerationError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Unable to generate concept." }, {
      status: 500,
    });
  }
}
