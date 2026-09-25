import { NextResponse } from "next/server";
import {
  requireBrandEdit,
} from "@/lib/assistant/brand-brain/api-auth";
import {
  deleteBrandProduct,
  getBrandProductById,
  updateBrandProduct,
} from "@/lib/assistant/brand-brain/service";
import { isValidUuid } from "@/lib/assistant/resource-scope";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

function linesToArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
  }

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
    const existing = await getBrandProductById(ctx, id);
    if (!existing) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    const product = await updateBrandProduct(ctx, id, {
      name: typeof body.name === "string" ? body.name : existing.name,
      description:
        typeof body.description === "string" ? body.description : existing.description,
      audience: typeof body.audience === "string" ? body.audience : existing.audience,
      keyBenefits: linesToArray(body.keyBenefits) ?? existing.keyBenefits,
      differentiators:
        linesToArray(body.differentiators) ?? existing.differentiators,
      approvedClaims: linesToArray(body.approvedClaims) ?? existing.approvedClaims,
      prohibitedClaims:
        linesToArray(body.prohibitedClaims) ?? existing.prohibitedClaims,
      websiteUrl:
        typeof body.websiteUrl === "string" ? body.websiteUrl : existing.websiteUrl,
    });
    return NextResponse.json({ product });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update product.";
    const status = message.includes("permission") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
  }

  const auth = await requireScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  try {
    const { ctx } = requireBrandEdit(auth);
    const ok = await deleteBrandProduct(ctx, id);
    if (!ok) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete product.";
    const status = message.includes("permission") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
