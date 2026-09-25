import { NextResponse } from "next/server";
import { requireAgentEdit, requireAgentView } from "@/lib/agent/api-auth";
import {
  generateGrowthBrief,
  getLatestGrowthBrief,
  listGrowthBriefs,
  toGrowthBriefSummary,
} from "@/lib/agent/brief";
import type { GrowthBriefType } from "@/lib/agent/types";
import {
  requireOperationalScopedAuth,
  requireScopedAuth,
} from "@/lib/workspaces/api-auth";

function parseBriefType(value: string | null): GrowthBriefType | null {
  if (value === "daily" || value === "weekly") return value;
  return null;
}

export async function GET(request: Request) {
  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  try {
    const { ctx } = requireAgentView(auth);
    const url = new URL(request.url);
    const latest = url.searchParams.get("latest") === "1";
    const history = url.searchParams.get("history") === "1";
    const briefType = parseBriefType(url.searchParams.get("type"));

    if (history) {
      const briefs = await listGrowthBriefs(ctx, {
        briefType: briefType ?? undefined,
        limit: 30,
      });
      return NextResponse.json({ briefs });
    }

    if (latest) {
      const brief = await getLatestGrowthBrief(ctx, briefType ?? undefined);
      if (!brief) {
        return NextResponse.json({ brief: null, summary: null });
      }
      return NextResponse.json({
        brief,
        summary: toGrowthBriefSummary(brief),
      });
    }

    const brief = await getLatestGrowthBrief(ctx, briefType ?? "weekly");
    return NextResponse.json({
      brief,
      summary: brief ? toGrowthBriefSummary(brief) : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load growth brief.";
    const status = message.includes("permission") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  let body: { type?: string; regenerate?: boolean };
  try {
    body = (await request.json()) as { type?: string; regenerate?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const briefType = parseBriefType(body.type ?? null);
  if (!briefType) {
    return NextResponse.json(
      { error: 'type must be "daily" or "weekly".' },
      { status: 400 }
    );
  }

  try {
    const { ctx } = requireAgentEdit(auth);
    const brief = await generateGrowthBrief(ctx, briefType, {
      regenerate: Boolean(body.regenerate),
    });
    return NextResponse.json({
      brief,
      summary: toGrowthBriefSummary(brief),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate brief.";
    const status = message.includes("permission") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
