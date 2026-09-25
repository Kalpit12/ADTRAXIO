import { NextResponse } from "next/server";
import {
  requireExecutionEdit,
  requireExecutionExecute,
  requireExecutionView,
} from "@/lib/execution/api-auth";
import { executeApprovedSteps } from "@/lib/execution/execute";
import {
  getExecutionPlan,
  isPlanExpired,
  updateExecutionPlan,
} from "@/lib/execution/plan-service";
import { prepareExecutionPlan } from "@/lib/execution/prepare";
import { appendAuditEntry } from "@/lib/execution/audit";
import { applyStepPatches } from "@/lib/execution/validation";
import { isValidUuid } from "@/lib/assistant/resource-scope";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
  }

  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  try {
    const { ctx } = requireExecutionView(auth);
    const plan = await getExecutionPlan(ctx, id);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }
    return NextResponse.json({
      plan,
      expired: isPlanExpired(plan),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load plan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
  }

  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  let body: {
    status?: string;
    stepPatches?: Array<{
      stepId: string;
      approved?: boolean;
      input?: Record<string, unknown>;
      scheduleItems?: Array<{
        contentId: string;
        socialAccountId: string;
        platform: string;
        scheduledFor: string;
        timezone: string;
        caption?: string;
        scheduledPostId?: string;
      }>;
    }>;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const { ctx } = requireExecutionEdit(auth);
    const existing = await getExecutionPlan(ctx, id);
    if (!existing) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    let planJson = existing.plan;
    if (body.stepPatches?.length) {
      planJson = applyStepPatches(planJson, body.stepPatches, ctx.user.id);
      planJson = appendAuditEntry(planJson, {
        actorId: ctx.user.id,
        action: "steps_updated",
        detail: `${body.stepPatches.length} step patch(es)`,
        success: true,
      });
    }

    const plan = await updateExecutionPlan(ctx, id, {
      status: body.status as typeof existing.status | undefined,
      plan: planJson,
    });
    return NextResponse.json({ plan });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update plan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
  }

  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  let body: { action?: string; stepIds?: string[]; retryFailedOnly?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    const action = body.action ?? "execute";

    if (action === "prepare") {
      const { ctx } = requireExecutionEdit(auth);
      const result = await prepareExecutionPlan(ctx, id);
      return NextResponse.json(result);
    }

    const { ctx } = requireExecutionExecute(auth);
    const plan = await getExecutionPlan(ctx, id);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }
    if (isPlanExpired(plan)) {
      return NextResponse.json({ error: "Plan expired." }, { status: 410 });
    }

    const result = await executeApprovedSteps(ctx, id, {
      stepIds: body.stepIds,
      retryFailedOnly: body.retryFailedOnly,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to execute plan.";
    const status = message.includes("permission") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
