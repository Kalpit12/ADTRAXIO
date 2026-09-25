import { isValidUuid } from "../resource-scope";
import type { AssistantContext } from "../types";
import {
  clientWorkspaceIdForInsert,
  scopeBrandBrainQuery,
} from "./scope";
import type {
  BrandMemoryRecord,
  BrandProductRecord,
  BrandProfileRecord,
  MemoryCategory,
  MemorySource,
} from "./types";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0
  );
}

type ProfileRow = {
  id: string;
  organization_id: string;
  client_workspace_id: string | null;
  business_name: string | null;
  industry: string | null;
  description: string | null;
  target_audience: string | null;
  brand_voice: string | null;
  tone: string | null;
  content_pillars: unknown;
  preferred_platforms: unknown;
  preferred_ctas: unknown;
  keywords: unknown;
  avoid_words: unknown;
  brand_rules: unknown;
  goals: unknown;
  created_at: string;
  updated_at: string;
};

function mapProfile(row: ProfileRow): BrandProfileRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientWorkspaceId: row.client_workspace_id,
    businessName: row.business_name,
    industry: row.industry,
    description: row.description,
    targetAudience: row.target_audience,
    brandVoice: row.brand_voice,
    tone: row.tone,
    contentPillars: asStringArray(row.content_pillars),
    preferredPlatforms: asStringArray(row.preferred_platforms),
    preferredCtas: asStringArray(row.preferred_ctas),
    keywords: asStringArray(row.keywords),
    avoidWords: asStringArray(row.avoid_words),
    brandRules: asStringArray(row.brand_rules),
    goals: asStringArray(row.goals),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type ProductRow = {
  id: string;
  organization_id: string;
  client_workspace_id: string | null;
  name: string;
  description: string | null;
  audience: string | null;
  key_benefits: unknown;
  differentiators: unknown;
  approved_claims: unknown;
  prohibited_claims: unknown;
  website_url: string | null;
  created_at: string;
  updated_at: string;
};

function mapProduct(row: ProductRow): BrandProductRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientWorkspaceId: row.client_workspace_id,
    name: row.name,
    description: row.description,
    audience: row.audience,
    keyBenefits: asStringArray(row.key_benefits),
    differentiators: asStringArray(row.differentiators),
    approvedClaims: asStringArray(row.approved_claims),
    prohibitedClaims: asStringArray(row.prohibited_claims),
    websiteUrl: row.website_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type MemoryRow = {
  id: string;
  organization_id: string;
  client_workspace_id: string | null;
  category: string;
  key: string;
  value: string;
  source: string;
  confidence: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

function mapMemory(row: MemoryRow): BrandMemoryRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientWorkspaceId: row.client_workspace_id,
    category: row.category as BrandMemoryRecord["category"],
    key: row.key,
    value: row.value,
    source: row.source as MemorySource,
    confidence: row.confidence,
    status: row.status as BrandMemoryRecord["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getOrCreateBrandProfile(
  ctx: AssistantContext
): Promise<BrandProfileRecord | null> {
  let query = ctx.supabase
    .from("ai_brand_profiles")
    .select("*")
    .eq("organization_id", ctx.organizationId);
  query = scopeBrandBrainQuery(query, ctx);
  const { data: existing, error } = await query.maybeSingle();
  if (error) {
    if (error.code === "42P01") return null;
    throw new Error(error.message);
  }
  if (existing) return mapProfile(existing as ProfileRow);

  const { data: created, error: insertError } = await ctx.supabase
    .from("ai_brand_profiles")
    .insert({
      organization_id: ctx.organizationId,
      client_workspace_id: clientWorkspaceIdForInsert(ctx),
      created_by: ctx.user.id,
    })
    .select("*")
    .single();

  if (insertError) {
    if (insertError.code === "42P01") return null;
    throw new Error(insertError.message);
  }
  return mapProfile(created as ProfileRow);
}

export async function updateBrandProfile(
  ctx: AssistantContext,
  patch: Partial<{
    businessName: string | null;
    industry: string | null;
    description: string | null;
    targetAudience: string | null;
    brandVoice: string | null;
    tone: string | null;
    contentPillars: string[];
    preferredPlatforms: string[];
    preferredCtas: string[];
    keywords: string[];
    avoidWords: string[];
    brandRules: string[];
    goals: string[];
  }>
): Promise<BrandProfileRecord | null> {
  const profile = await getOrCreateBrandProfile(ctx);
  if (!profile) return null;

  const { data, error } = await ctx.supabase
    .from("ai_brand_profiles")
    .update({
      business_name: patch.businessName ?? profile.businessName,
      industry: patch.industry ?? profile.industry,
      description: patch.description ?? profile.description,
      target_audience: patch.targetAudience ?? profile.targetAudience,
      brand_voice: patch.brandVoice ?? profile.brandVoice,
      tone: patch.tone ?? profile.tone,
      content_pillars: patch.contentPillars ?? profile.contentPillars,
      preferred_platforms: patch.preferredPlatforms ?? profile.preferredPlatforms,
      preferred_ctas: patch.preferredCtas ?? profile.preferredCtas,
      keywords: patch.keywords ?? profile.keywords,
      avoid_words: patch.avoidWords ?? profile.avoidWords,
      brand_rules: patch.brandRules ?? profile.brandRules,
      goals: patch.goals ?? profile.goals,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id)
    .eq("organization_id", ctx.organizationId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapProfile(data as ProfileRow);
}

export async function listBrandProducts(
  ctx: AssistantContext
): Promise<BrandProductRecord[]> {
  let query = ctx.supabase
    .from("ai_brand_products")
    .select("*")
    .eq("organization_id", ctx.organizationId)
    .order("name", { ascending: true });
  query = scopeBrandBrainQuery(query, ctx);
  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => mapProduct(row as ProductRow));
}

export async function getBrandProductById(
  ctx: AssistantContext,
  productId: string
): Promise<BrandProductRecord | null> {
  if (!isValidUuid(productId)) return null;
  let query = ctx.supabase
    .from("ai_brand_products")
    .select("*")
    .eq("id", productId)
    .eq("organization_id", ctx.organizationId);
  query = scopeBrandBrainQuery(query, ctx);
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return mapProduct(data as ProductRow);
}

export async function findBrandProductByName(
  ctx: AssistantContext,
  name: string
): Promise<BrandProductRecord | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const products = await listBrandProducts(ctx);
  const lower = trimmed.toLowerCase();
  return (
    products.find((p) => p.name.toLowerCase() === lower) ??
    products.find((p) => p.name.toLowerCase().includes(lower)) ??
    null
  );
}

export async function createBrandProduct(
  ctx: AssistantContext,
  input: {
    name: string;
    description?: string | null;
    audience?: string | null;
    keyBenefits?: string[];
    differentiators?: string[];
    approvedClaims?: string[];
    prohibitedClaims?: string[];
    websiteUrl?: string | null;
  }
): Promise<BrandProductRecord> {
  const { data, error } = await ctx.supabase
    .from("ai_brand_products")
    .insert({
      organization_id: ctx.organizationId,
      client_workspace_id: clientWorkspaceIdForInsert(ctx),
      name: input.name,
      description: input.description,
      audience: input.audience,
      key_benefits: input.keyBenefits ?? [],
      differentiators: input.differentiators ?? [],
      approved_claims: input.approvedClaims ?? [],
      prohibited_claims: input.prohibitedClaims ?? [],
      website_url: input.websiteUrl ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapProduct(data as ProductRow);
}

export async function updateBrandProduct(
  ctx: AssistantContext,
  productId: string,
  patch: Partial<BrandProductRecord>
): Promise<BrandProductRecord | null> {
  const existing = await getBrandProductById(ctx, productId);
  if (!existing) return null;

  const { data, error } = await ctx.supabase
    .from("ai_brand_products")
    .update({
      name: patch.name ?? existing.name,
      description: patch.description ?? existing.description,
      audience: patch.audience ?? existing.audience,
      key_benefits: patch.keyBenefits ?? existing.keyBenefits,
      differentiators: patch.differentiators ?? existing.differentiators,
      approved_claims: patch.approvedClaims ?? existing.approvedClaims,
      prohibited_claims: patch.prohibitedClaims ?? existing.prohibitedClaims,
      website_url: patch.websiteUrl ?? existing.websiteUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("organization_id", ctx.organizationId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapProduct(data as ProductRow);
}

export async function deleteBrandProduct(
  ctx: AssistantContext,
  productId: string
): Promise<boolean> {
  const existing = await getBrandProductById(ctx, productId);
  if (!existing) return false;
  const { error } = await ctx.supabase
    .from("ai_brand_products")
    .delete()
    .eq("id", productId)
    .eq("organization_id", ctx.organizationId);
  if (error) throw new Error(error.message);
  return true;
}

export async function listActiveMemories(
  ctx: AssistantContext
): Promise<BrandMemoryRecord[]> {
  let query = ctx.supabase
    .from("ai_memory")
    .select("*")
    .eq("organization_id", ctx.organizationId)
    .eq("status", "active")
    .in("source", ["explicit", "user_confirmed"])
    .order("updated_at", { ascending: false })
    .limit(50);
  query = scopeBrandBrainQuery(query, ctx);
  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => mapMemory(row as MemoryRow));
}

export async function listAllMemories(
  ctx: AssistantContext
): Promise<BrandMemoryRecord[]> {
  let query = ctx.supabase
    .from("ai_memory")
    .select("*")
    .eq("organization_id", ctx.organizationId)
    .order("updated_at", { ascending: false })
    .limit(100);
  query = scopeBrandBrainQuery(query, ctx);
  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => mapMemory(row as MemoryRow));
}

export async function createBrandMemory(
  ctx: AssistantContext,
  input: {
    category: MemoryCategory;
    key: string;
    value: string;
    source: MemorySource;
    confidence?: string | null;
  }
): Promise<BrandMemoryRecord> {
  const { data, error } = await ctx.supabase
    .from("ai_memory")
    .insert({
      organization_id: ctx.organizationId,
      client_workspace_id: clientWorkspaceIdForInsert(ctx),
      category: input.category,
      key: input.key,
      value: input.value,
      source: input.source,
      confidence: input.confidence ?? null,
      status: "active",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapMemory(data as MemoryRow);
}

export async function archiveBrandMemory(
  ctx: AssistantContext,
  memoryId: string
): Promise<boolean> {
  if (!isValidUuid(memoryId)) return false;
  let query = ctx.supabase
    .from("ai_memory")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", memoryId)
    .eq("organization_id", ctx.organizationId);
  query = scopeBrandBrainQuery(query, ctx);
  const { error } = await query;
  if (error) throw new Error(error.message);
  return true;
}

export async function getBrandMemoryById(
  ctx: AssistantContext,
  memoryId: string
): Promise<BrandMemoryRecord | null> {
  if (!isValidUuid(memoryId)) return null;
  let query = ctx.supabase
    .from("ai_memory")
    .select("*")
    .eq("id", memoryId)
    .eq("organization_id", ctx.organizationId);
  query = scopeBrandBrainQuery(query, ctx);
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return mapMemory(data as MemoryRow);
}
