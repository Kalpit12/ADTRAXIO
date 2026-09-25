import { NextResponse } from "next/server";
import { requireAgentEdit, requireAgentView } from "@/lib/agent/api-auth";
import {
  getGrowthBriefById,
  toGrowthBriefSummary,
  updateGrowthBriefStatus,
} from "@/lib/agent/brief";
import type { GrowthBriefStatus } from "@/lib/agent/types";
import { isValidUuid } from "@/lib/assistant/resource-scope";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

function parseStatus(value: unknown): GrowthBriefStatus | null {
  if (value === "generated" || value === "reviewed" || value === "archived") {
    return value;
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid brief id." }, { status: 400 });
  }

  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  try {
    const { ctx } = requireAgentView(auth);
    const brief = await getGrowthBriefById(ctx, id);
    if (!brief) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 });
    }
    return NextResponse.json({
      brief,
      summary: toGrowthBriefSummary(brief),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load brief.";
    const status = message.includes("permission") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid brief id." }, { status: 400 });
  }

  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  let body: { status?: unknown };
  try {
    body = (await request.json()) as { status?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const status = parseStatus(body.status);
  if (!status) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  try {
    const { ctx } = requireAgentEdit(auth);
    const brief = await updateGrowthBriefStatus(ctx, id, status);
    if (!brief) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 });
    }
    return NextResponse.json({ brief });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update brief.";
    const statusCode = message.includes("permission") ? 403 : 500;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
