import { NextResponse } from "next/server";
import { requireBrandEdit } from "@/lib/assistant/brand-brain/api-auth";
import { getBrandMemoryById } from "@/lib/assistant/brand-brain/service";
import { isValidUuid } from "@/lib/assistant/resource-scope";
import { requireScopedAuth } from "@/lib/workspaces/api-auth";

/** Reactivate an archived memory (explicit user action). New memories use pending actions. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid memory id." }, { status: 400 });
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
    const memory = await getBrandMemoryById(ctx, id);
    if (!memory) {
      return NextResponse.json({ error: "Memory not found." }, { status: 404 });
    }

    const { error } = await ctx.supabase
      .from("ai_memory")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", ctx.organizationId);

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to approve memory.";
    const status = message.includes("permission") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
