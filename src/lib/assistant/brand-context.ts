import { getCompactBrandPrompt } from "./brand-brain/loader";
import type { AssistantContext } from "./types";

export interface BrandContext {
  businessName: string | null;
  industry: string | null;
  goals: string[];
  audience: string | null;
  platforms: string[];
  tone: string | null;
}

/** @deprecated Use getCompactBrandPrompt / loadBrandBrainContext */
export async function buildBrandContext(
  ctx: AssistantContext
): Promise<BrandContext> {
  const prompt = await getCompactBrandPrompt(ctx, { mode: "full" });
  return {
    businessName: null,
    industry: null,
    goals: [],
    audience: null,
    platforms: [],
    tone: null,
    _legacyPrompt: prompt,
  } as BrandContext & { _legacyPrompt?: string };
}

export async function formatBrandContextForPromptFromBrain(
  ctx: AssistantContext,
  options?: { productName?: string; productId?: string; mode?: "full" | "generation" | "strategy" }
): Promise<string> {
  return getCompactBrandPrompt(ctx, options);
}

export function formatBrandContextForPrompt(brand: BrandContext): string {
  const lines = [
    brand.businessName ? `- Business: ${brand.businessName}` : null,
    brand.industry ? `- Industry: ${brand.industry}` : null,
    brand.goals.length ? `- Goals: ${brand.goals.join(", ")}` : null,
    brand.platforms.length
      ? `- Connected platforms: ${brand.platforms.join(", ")}`
      : null,
    brand.audience ? `- Audience: ${brand.audience}` : null,
    brand.tone ? `- Tone: ${brand.tone}` : null,
  ].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : "No brand profile fields on file.";
}
