import { NextResponse } from "next/server";
import {
  requireBrandEdit,
  requireBrandView,
} from "@/lib/assistant/brand-brain/api-auth";
import {
  getOrCreateBrandProfile,
  updateBrandProfile,
} from "@/lib/assistant/brand-brain/service";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

function linesToArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export async function GET() {
  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }
  try {
    const { ctx } = requireBrandView(auth);
    const profile = await getOrCreateBrandProfile(ctx);
    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load brand.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const { ctx } = requireBrandEdit(auth);
    const profile = await updateBrandProfile(ctx, {
      businessName: typeof body.businessName === "string" ? body.businessName : undefined,
      industry: typeof body.industry === "string" ? body.industry : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      targetAudience:
        typeof body.targetAudience === "string" ? body.targetAudience : undefined,
      brandVoice: typeof body.brandVoice === "string" ? body.brandVoice : undefined,
      tone: typeof body.tone === "string" ? body.tone : undefined,
      contentPillars: body.contentPillars
        ? linesToArray(body.contentPillars)
        : undefined,
      preferredPlatforms: body.preferredPlatforms
        ? linesToArray(body.preferredPlatforms)
        : undefined,
      preferredCtas: body.preferredCtas ? linesToArray(body.preferredCtas) : undefined,
      keywords: body.keywords ? linesToArray(body.keywords) : undefined,
      avoidWords: body.avoidWords ? linesToArray(body.avoidWords) : undefined,
      brandRules: body.brandRules ? linesToArray(body.brandRules) : undefined,
      goals: body.goals ? linesToArray(body.goals) : undefined,
    });
    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update brand.";
    const status = message.includes("permission") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
