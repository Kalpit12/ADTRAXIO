import { NextResponse } from "next/server";
import {
  requireBrandEdit,
  requireBrandView,
} from "@/lib/assistant/brand-brain/api-auth";
import {
  createBrandProduct,
  listBrandProducts,
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
    const products = await listBrandProducts(ctx);
    return NextResponse.json({ products });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load products.";
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
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Product name is required." }, { status: 400 });
  }

  try {
    const { ctx } = requireBrandEdit(auth);
    const product = await createBrandProduct(ctx, {
      name,
      description: typeof body.description === "string" ? body.description : null,
      audience: typeof body.audience === "string" ? body.audience : null,
      keyBenefits: linesToArray(body.keyBenefits),
      differentiators: linesToArray(body.differentiators),
      approvedClaims: linesToArray(body.approvedClaims),
      prohibitedClaims: linesToArray(body.prohibitedClaims),
      websiteUrl: typeof body.websiteUrl === "string" ? body.websiteUrl : null,
    });
    return NextResponse.json({ product });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create product.";
    const status = message.includes("permission") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
