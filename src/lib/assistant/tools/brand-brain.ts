import { getTopContentTool } from "./analytics";
import { createPendingAction } from "../confirmations";
import {
  applyBrandBrainToBrief,
  getCompactBrandPrompt,
  loadBrandBrainContext,
} from "../brand-brain/loader";
import {
  findBrandProductByName,
  getBrandProductById,
} from "../brand-brain/service";
import { serializeBrandBrainCompact } from "../brand-brain/serialize";
import { ensureOperationalScope } from "../permissions";
import { isValidUuid } from "../resource-scope";
import type { AssistantContext } from "../types";
import type { MemoryCategory } from "../brand-brain/types";

export async function getBrandContextTool(
  ctx: AssistantContext,
  args: { mode?: string; productId?: string; productName?: string }
) {
  ensureOperationalScope(ctx.scope);
  const mode =
    args.mode === "full" || args.mode === "strategy" ? args.mode : "generation";
  const brain = await loadBrandBrainContext(ctx, {
    productId: args.productId,
    productName: args.productName,
    mode,
  });
  return {
    compact: serializeBrandBrainCompact(brain, mode),
    profile: brain.profile,
    product: brain.product,
    productCount: brain.products.length,
    activeMemoryCount: brain.memories.length,
  };
}

export async function getBrandProductTool(
  ctx: AssistantContext,
  args: { productId?: string; productName?: string }
) {
  ensureOperationalScope(ctx.scope);
  if (args.productId?.trim()) {
    if (!isValidUuid(args.productId)) return { error: "Invalid productId." };
    const product = await getBrandProductById(ctx, args.productId);
    if (!product) return { error: "Product not found." };
    return { product };
  }
  if (args.productName?.trim()) {
    const product = await findBrandProductByName(ctx, args.productName);
    if (!product) return { error: "Product not found." };
    return { product };
  }
  return { error: "productId or productName is required." };
}

export async function proposeSaveBrandMemoryTool(
  ctx: AssistantContext,
  args: {
    category: string;
    key: string;
    value: string;
    conversationId: string;
  }
) {
  ensureOperationalScope(ctx.scope);
  const category = args.category as MemoryCategory;
  const key = args.key?.trim();
  const value = args.value?.trim();
  if (!key || !value) return { error: "key and value are required." };
  if (
    !["preference", "brand", "audience", "strategy", "content", "product"].includes(
      category
    )
  ) {
    return { error: "Invalid memory category." };
  }

  return createPendingAction(ctx, {
    conversationId: args.conversationId,
    actionType: "save_brand_memory",
    payload: { category, key, value },
    summary: `Save brand preference: ${value}`,
  });
}

export async function proposeLearnedPatternsTool(
  ctx: AssistantContext,
  args: { conversationId: string }
) {
  ensureOperationalScope(ctx.scope);
  const topContent = await getTopContentTool(ctx, { dateRange: "30d", limit: 8 });
  const patterns: string[] = [];

  if (Array.isArray(topContent) && topContent.length > 0) {
    patterns.push(
      `${topContent.length} top content items identified from measured performance (last 30 days).`
    );
    for (const item of topContent.slice(0, 3)) {
      const row = item as { platform?: string; engagement?: number; caption?: string };
      if (row.engagement != null) {
        patterns.push(
          `High engagement on ${row.platform ?? "platform"}: ${row.engagement.toLocaleString()} engagement.`
        );
      }
    }
  } else {
    return {
      error: "Not enough performance data to propose learned patterns.",
    };
  }

  return {
    patterns,
    note:
      "These are analytics observations, not saved brand facts. Ask the user to confirm before saving.",
    pendingAction: await createPendingAction(ctx, {
      conversationId: args.conversationId,
      actionType: "save_brand_memory",
      payload: {
        category: "strategy",
        key: "learned_content_patterns",
        value: patterns.join("\n"),
      },
      summary: "Save learned content patterns as a strategy preference",
    }),
  };
}

export async function enrichBriefWithBrandBrain(
  ctx: AssistantContext,
  brief: import("@/lib/content/types").CreativeBrief,
  options?: { productName?: string; productId?: string }
) {
  const brain = await loadBrandBrainContext(ctx, options);
  return applyBrandBrainToBrief(brief, brain);
}

export { getCompactBrandPrompt };
