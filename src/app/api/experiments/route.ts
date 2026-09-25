import { NextResponse } from "next/server";
import { requireExperimentEdit, requireExperimentView } from "@/lib/experiments/api-auth";
import { createExperimentFromDraft, listExperiments } from "@/lib/experiments/service";
import { ExperimentValidationError, validateVariantInputs } from "@/lib/experiments/validation";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

export async function GET(request: Request) {
  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 20);
  try {
    const { ctx } = requireExperimentView(auth);
    const experiments = await listExperiments(ctx, {
      limit: Math.min(Math.max(limit, 1), 50),
      status: status as import("@/lib/experiments/types").ExperimentStatus | undefined,
    });
    return NextResponse.json({ experiments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list experiments.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }
  let body: {
    name?: string;
    objective?: string;
    hypothesis?: string;
    platform?: string | null;
    successMetric?: string;
    secondaryMetrics?: string[];
    minimumObservationDays?: number;
    sampleTarget?: number | null;
    variants?: Array<{
      name: string;
      description?: string;
      variantKey: string;
      allocationPercent: number;
    }>;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!body.name?.trim() || !body.objective?.trim() || !body.variants?.length) {
    return NextResponse.json(
      { error: "name, objective, and variants are required." },
      { status: 400 }
    );
  }
  try {
    validateVariantInputs(body.variants);
    const { ctx } = requireExperimentEdit(auth);
    const experiment = await createExperimentFromDraft(ctx, {
      draft: {
        name: body.name.trim(),
        objective: body.objective.trim(),
        hypothesis: body.hypothesis?.trim() ?? "",
        platform: body.platform ?? null,
        successMetric: body.successMetric ?? "engagement",
        secondaryMetrics: body.secondaryMetrics ?? [],
        minimumObservationDays: body.minimumObservationDays ?? 14,
        sampleTarget: body.sampleTarget ?? null,
        allocationType: "fixed_split",
        variants: body.variants,
      },
    });
    return NextResponse.json({ experiment });
  } catch (error) {
    if (error instanceof ExperimentValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unable to create experiment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
