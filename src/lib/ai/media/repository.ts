import type { SupabaseClient } from "@supabase/supabase-js";
import type { GenerationStatus, MediaProvider, MediaType, PublicGenerationJob, PublicMediaAsset } from "./types";

export interface GenerationJobRow {
  id: string;
  organization_id: string;
  client_workspace_id: string | null;
  created_by: string;
  provider: MediaProvider;
  media_type: MediaType;
  status: GenerationStatus;
  idempotency_key: string | null;
  prompt: string;
  input_metadata: Record<string, unknown>;
  output_storage_path: string | null;
  media_asset_id: string | null;
  error_category: string | null;
  error_message: string | null;
  provider_job_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaAssetRow {
  id: string;
  organization_id: string;
  client_workspace_id: string | null;
  created_by: string;
  media_type: MediaType;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  provider: MediaProvider;
  generation_job_id: string | null;
  source_asset_id: string | null;
  edit_spec: Record<string, unknown> | null;
  created_at: string;
}

export function toPublicJob(row: GenerationJobRow): PublicGenerationJob {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientWorkspaceId: row.client_workspace_id,
    provider: row.provider,
    mediaType: row.media_type,
    status: row.status,
    prompt: row.prompt,
    mediaAssetId: row.media_asset_id,
    errorCategory: row.error_category,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

export function toPublicAsset(row: MediaAssetRow): PublicMediaAsset {
  return {
    id: row.id,
    mediaType: row.media_type,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    width: row.width,
    height: row.height,
    durationSeconds: row.duration_seconds ? Number(row.duration_seconds) : null,
    fileSizeBytes: row.file_size_bytes ? Number(row.file_size_bytes) : null,
    provider: row.provider,
    generationJobId: row.generation_job_id,
    sourceAssetId: row.source_asset_id ?? null,
    editSpec: row.edit_spec ?? null,
    createdAt: row.created_at,
  };
}

export async function findJobByIdempotencyKey(
  supabase: SupabaseClient,
  organizationId: string,
  idempotencyKey: string
): Promise<GenerationJobRow | null> {
  const { data, error } = await supabase
    .from("ai_media_generation_jobs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data as GenerationJobRow;
}

export async function insertGenerationJob(
  supabase: SupabaseClient,
  row: {
    organizationId: string;
    clientWorkspaceId: string | null;
    createdBy: string;
    provider: MediaProvider;
    mediaType: MediaType;
    prompt: string;
    inputMetadata?: Record<string, unknown>;
    idempotencyKey?: string;
  }
): Promise<GenerationJobRow> {
  const { data, error } = await supabase
    .from("ai_media_generation_jobs")
    .insert({
      organization_id: row.organizationId,
      client_workspace_id: row.clientWorkspaceId,
      created_by: row.createdBy,
      provider: row.provider,
      media_type: row.mediaType,
      status: "queued",
      prompt: row.prompt,
      input_metadata: row.inputMetadata ?? {},
      idempotency_key: row.idempotencyKey ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create generation job.");
  }
  return data as GenerationJobRow;
}

export async function getGenerationJob(
  supabase: SupabaseClient,
  jobId: string
): Promise<GenerationJobRow | null> {
  const { data, error } = await supabase
    .from("ai_media_generation_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data as GenerationJobRow;
}

export async function updateGenerationJob(
  supabase: SupabaseClient,
  jobId: string,
  patch: Partial<{
    status: GenerationStatus;
    output_storage_path: string | null;
    media_asset_id: string | null;
    error_category: string | null;
    error_message: string | null;
    provider_job_id: string | null;
    started_at: string | null;
    completed_at: string | null;
    updated_at: string;
  }>
): Promise<GenerationJobRow> {
  const { data, error } = await supabase
    .from("ai_media_generation_jobs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to update generation job.");
  }
  return data as GenerationJobRow;
}

export async function insertMediaAsset(
  supabase: SupabaseClient,
  row: {
    organizationId: string;
    clientWorkspaceId: string | null;
    createdBy: string;
    mediaType: MediaType;
    storageBucket: string;
    storagePath: string;
    mimeType: string;
    width?: number;
    height?: number;
    durationSeconds?: number;
    fileSizeBytes: number;
    provider: MediaProvider;
    generationJobId?: string | null;
    sourceAssetId?: string | null;
    editSpec?: Record<string, unknown> | null;
  }
): Promise<MediaAssetRow> {
  const { data, error } = await supabase
    .from("ai_media_assets")
    .insert({
      organization_id: row.organizationId,
      client_workspace_id: row.clientWorkspaceId,
      created_by: row.createdBy,
      media_type: row.mediaType,
      storage_bucket: row.storageBucket,
      storage_path: row.storagePath,
      mime_type: row.mimeType,
      width: row.width ?? null,
      height: row.height ?? null,
      duration_seconds: row.durationSeconds ?? null,
      file_size_bytes: row.fileSizeBytes,
      provider: row.provider,
      generation_job_id: row.generationJobId ?? null,
      source_asset_id: row.sourceAssetId ?? null,
      edit_spec: row.editSpec ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create media asset.");
  }
  return data as MediaAssetRow;
}

export async function getMediaAsset(
  supabase: SupabaseClient,
  assetId: string
): Promise<MediaAssetRow | null> {
  const { data, error } = await supabase
    .from("ai_media_assets")
    .select("*")
    .eq("id", assetId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data as MediaAssetRow;
}
