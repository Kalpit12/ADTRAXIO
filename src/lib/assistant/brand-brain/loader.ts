import type { CreativeBrief } from "@/lib/content/types";
import type { AssistantContext } from "../types";
import {
  findBrandProductByName,
  getBrandProductById,
  getOrCreateBrandProfile,
  listActiveMemories,
  listBrandProducts,
} from "./service";
import { serializeBrandBrainCompact } from "./serialize";
import type { BrandBrainContext, BrandProductRecord } from "./types";

export async function loadBrandBrainContext(
  ctx: AssistantContext,
  options?: {
    productId?: string;
    productName?: string;
    mode?: "full" | "generation" | "strategy";
  }
): Promise<BrandBrainContext> {
  const [profile, products, memories] = await Promise.all([
    getOrCreateBrandProfile(ctx),
    listBrandProducts(ctx),
    listActiveMemories(ctx),
  ]);

  let product: BrandProductRecord | null = null;
  if (options?.productId) {
    product = await getBrandProductById(ctx, options.productId);
  } else if (options?.productName) {
    product = await findBrandProductByName(ctx, options.productName);
  }

  return { profile, products, memories, product };
}

export async function getCompactBrandPrompt(
  ctx: AssistantContext,
  options?: {
    productId?: string;
    productName?: string;
    mode?: "full" | "generation" | "strategy";
  }
): Promise<string> {
  const brain = await loadBrandBrainContext(ctx, options);
  return serializeBrandBrainCompact(brain, options?.mode ?? "generation");
}

export function applyBrandBrainToBrief(
  brief: CreativeBrief,
  brain: BrandBrainContext
): CreativeBrief {
  const profile = brain.profile;
  const next = { ...brief };

  if (!next.audience?.trim() && profile?.targetAudience) {
    next.audience = profile.targetAudience;
  }
  if (profile?.tone && next.tone === "professional") {
    const mapped = profile.tone.toLowerCase();
    if (
      mapped === "bold" ||
      mapped === "educational" ||
      mapped === "conversational" ||
      mapped === "premium"
    ) {
      next.tone = mapped as CreativeBrief["tone"];
    }
  }

  const contextParts = [next.additionalContext];
  const serialized = serializeBrandBrainCompact(
    { ...brain, product: brain.product ?? null },
    "generation"
  );
  if (serialized && !serialized.startsWith("No approved")) {
    contextParts.push(serialized);
  }

  next.additionalContext = contextParts.filter(Boolean).join("\n\n");
  return next;
}
