import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertProviderConfigured, DEFAULT_PROVIDER_BY_MEDIA } from "./config";
import { MediaGenerationError, safeUserMessage, toPublicError } from "./errors";
import { getMediaProviderRegistry } from "./providers/registry";
import {
  findJobByIdempotencyKey,
  getGenerationJob,
  insertGenerationJob,
  insertMediaAsset,
  toPublicJob,
  updateGenerationJob,
  type GenerationJobRow,
} from "./repository";
import { assertStatusTransition } from "./status";
import {
  buildGeneratedMediaStoragePath,
  extensionForMime,
  GENERATED_MEDIA_BUCKET,
} from "./storage";
import type {
  ImageGenerationRequest,
  MediaGenerationScope,
  MediaProvider,
  MediaType,
  ProviderAsyncHandle,
  ProviderBinaryResult,
  ProviderVideoResult,
  PublicGenerationJob,
  SoundGenerationRequest,
  SpeechGenerationRequest,
  VideoGenerationRequest,
} from "./types";

function isAsyncVideoHandle(
  result: ProviderVideoResult
): result is ProviderAsyncHandle {
  return "kind" in result && result.kind === "async";
}
import { recordMediaUsageEvent } from "./usage";

type StartJobInput = {
  mediaType: MediaType;
  provider?: MediaProvider;
  prompt: string;
  inputMetadata?: Record<string, unknown>;
  idempotencyKey?: string;
};

const processingLocks = new Set<string>();

export async function startMediaGenerationJob(
  supabase: SupabaseClient,
  scope: MediaGenerationScope,
  input: StartJobInput
): Promise<PublicGenerationJob> {
  const provider = input.provider ?? DEFAULT_PROVIDER_BY_MEDIA[input.mediaType];

  try {
    assertProviderConfigured(provider, input.mediaType);
  } catch {
    throw new MediaGenerationError(
      "configuration_error",
      safeUserMessage("configuration_error")
    );
  }

  if (input.idempotencyKey) {
    const existing = await findJobByIdempotencyKey(
      supabase,
      scope.organizationId,
      input.idempotencyKey
    );
    if (existing) {
      return toPublicJob(existing);
    }
  }

  let job: GenerationJobRow;
  try {
    job = await insertGenerationJob(supabase, {
      organizationId: scope.organizationId,
      clientWorkspaceId: scope.clientWorkspaceId,
      createdBy: scope.userId,
      provider,
      mediaType: input.mediaType,
      prompt: input.prompt,
      inputMetadata: input.inputMetadata,
      idempotencyKey: input.idempotencyKey,
    });
  } catch (error) {
    if (input.idempotencyKey) {
      const existing = await findJobByIdempotencyKey(
        supabase,
        scope.organizationId,
        input.idempotencyKey
      );
      if (existing) {
        return toPublicJob(existing);
      }
    }
    throw error;
  }

  queueMicrotask(() => {
    void processMediaGenerationJob(job.id).catch((err) => {
      console.error("[ai-media] background processing failed", err);
    });
  });

  return toPublicJob(job);
}

export async function getMediaGenerationJobForScope(
  supabase: SupabaseClient,
  scope: MediaGenerationScope,
  jobId: string
): Promise<PublicGenerationJob | null> {
  const job = await getGenerationJob(supabase, jobId);
  if (!job) {
    return null;
  }
  if (job.organization_id !== scope.organizationId) {
    return null;
  }
  if (
    scope.clientWorkspaceId &&
    job.client_workspace_id &&
    job.client_workspace_id !== scope.clientWorkspaceId
  ) {
    return null;
  }
  return toPublicJob(job);
}

export async function processMediaGenerationJob(jobId: string): Promise<void> {
  if (processingLocks.has(jobId)) {
    return;
  }
  processingLocks.add(jobId);

  const admin = createAdminClient();
  if (!admin) {
    processingLocks.delete(jobId);
    throw new MediaGenerationError("configuration_error", safeUserMessage("storage_error"), {
      logDetail: "Missing Supabase admin client",
    });
  }

  try {
    const job = await getGenerationJob(admin, jobId);
    if (!job) {
      return;
    }

    if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
      return;
    }

    if (job.status === "processing" && job.provider_job_id) {
      await pollAsyncVideoJob(admin, job);
      return;
    }

    assertStatusTransition(job.status, "processing");
    await updateGenerationJob(admin, jobId, {
      status: "processing",
      started_at: job.started_at ?? new Date().toISOString(),
    });

    const registry = getMediaProviderRegistry();

    if (job.media_type === "image") {
      const result = await registry.image.generateImage({
        prompt: job.prompt,
        size: typeof job.input_metadata.size === "string" ? job.input_metadata.size : undefined,
      });
      await finalizeBinaryResult(admin, job, result);
      return;
    }

    if (job.media_type === "video") {
      const videoResult = await registry.video.startVideoGeneration({
        prompt: job.prompt,
        durationSeconds:
          typeof job.input_metadata.durationSeconds === "number"
            ? job.input_metadata.durationSeconds
            : undefined,
        aspectRatio:
          typeof job.input_metadata.aspectRatio === "string"
            ? job.input_metadata.aspectRatio
            : undefined,
      });

      if (isAsyncVideoHandle(videoResult)) {
        await updateGenerationJob(admin, jobId, {
          status: "processing",
          provider_job_id: videoResult.providerJobId,
        });
        return;
      }

      await finalizeBinaryResult(admin, job, videoResult);
      return;
    }

    if (job.media_type === "audio") {
      const mode = job.input_metadata.mode;
      if (mode === "sound") {
        const result = await registry.sound.generateSoundEffect({
          text: job.prompt,
          durationSeconds:
            typeof job.input_metadata.durationSeconds === "number"
              ? job.input_metadata.durationSeconds
              : undefined,
        });
        await finalizeBinaryResult(admin, job, result);
        return;
      }

      const result = await registry.speech.generateSpeech({
        text: job.prompt,
        voiceId:
          typeof job.input_metadata.voiceId === "string"
            ? job.input_metadata.voiceId
            : undefined,
      });
      await finalizeBinaryResult(admin, job, result);
    }
  } catch (error) {
    const pub = toPublicError(error);
    await updateGenerationJob(admin, jobId, {
      status: "failed",
      error_category: pub.category,
      error_message: pub.error,
      completed_at: new Date().toISOString(),
    });
  } finally {
    processingLocks.delete(jobId);
  }
}

async function pollAsyncVideoJob(
  admin: SupabaseClient,
  job: GenerationJobRow
): Promise<void> {
  if (!job.provider_job_id) {
    return;
  }

  const registry = getMediaProviderRegistry();
  if (!registry.video.pollVideoGeneration) {
    return;
  }

  try {
    const result = await registry.video.pollVideoGeneration(job.provider_job_id);
    if (isAsyncVideoHandle(result)) {
      return;
    }
    await finalizeBinaryResult(admin, job, result);
  } catch (error) {
    const pub = toPublicError(error);
    await updateGenerationJob(admin, job.id, {
      status: "failed",
      error_category: pub.category,
      error_message: pub.error,
      completed_at: new Date().toISOString(),
    });
  }
}

async function finalizeBinaryResult(
  admin: SupabaseClient,
  job: GenerationJobRow,
  result: ProviderBinaryResult
): Promise<void> {
  const extension = extensionForMime(result.mimeType);
  const storagePath = buildGeneratedMediaStoragePath({
    organizationId: job.organization_id,
    clientWorkspaceId: job.client_workspace_id,
    mediaType: job.media_type,
    extension,
  });

  const { error: uploadError } = await admin.storage
    .from(GENERATED_MEDIA_BUCKET)
    .upload(storagePath, result.data, {
      contentType: result.mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new MediaGenerationError("storage_error", safeUserMessage("storage_error"), {
      logDetail: uploadError.message,
    });
  }

  const asset = await insertMediaAsset(admin, {
    organizationId: job.organization_id,
    clientWorkspaceId: job.client_workspace_id,
    createdBy: job.created_by,
    mediaType: job.media_type,
    storageBucket: GENERATED_MEDIA_BUCKET,
    storagePath,
    mimeType: result.mimeType,
    width: result.width,
    height: result.height,
    durationSeconds: result.durationSeconds,
    fileSizeBytes: result.data.length,
    provider: job.provider,
    generationJobId: job.id,
  });

  assertStatusTransition("processing", "completed");
  await updateGenerationJob(admin, job.id, {
    status: "completed",
    output_storage_path: storagePath,
    media_asset_id: asset.id,
    completed_at: new Date().toISOString(),
    error_category: null,
    error_message: null,
  });

  await recordMediaUsageEvent(admin, {
    organizationId: job.organization_id,
    clientWorkspaceId: job.client_workspace_id,
    userId: job.created_by,
    generationJobId: job.id,
    provider: job.provider,
    mediaType: job.media_type,
    model: result.model,
    units: result.units,
  });
}

export function buildScopeFromAuth(
  organizationId: string,
  userId: string,
  clientWorkspaceId: string | null
): MediaGenerationScope {
  return {
    organizationId,
    clientWorkspaceId,
    userId,
  };
}

export async function startImageGeneration(
  supabase: SupabaseClient,
  scope: MediaGenerationScope,
  request: ImageGenerationRequest
) {
  return startMediaGenerationJob(supabase, scope, {
    mediaType: "image",
    provider: "openai",
    prompt: request.prompt,
    idempotencyKey: request.idempotencyKey,
    inputMetadata: { size: request.size },
  });
}

export async function startVideoGeneration(
  supabase: SupabaseClient,
  scope: MediaGenerationScope,
  request: VideoGenerationRequest
) {
  return startMediaGenerationJob(supabase, scope, {
    mediaType: "video",
    provider: "google",
    prompt: request.prompt,
    idempotencyKey: request.idempotencyKey,
    inputMetadata: {
      durationSeconds: request.durationSeconds,
      aspectRatio: request.aspectRatio,
    },
  });
}

export async function startSpeechGeneration(
  supabase: SupabaseClient,
  scope: MediaGenerationScope,
  request: SpeechGenerationRequest
) {
  return startMediaGenerationJob(supabase, scope, {
    mediaType: "audio",
    provider: "elevenlabs",
    prompt: request.text,
    idempotencyKey: request.idempotencyKey,
    inputMetadata: { mode: "speech", voiceId: request.voiceId },
  });
}

export async function startSoundGeneration(
  supabase: SupabaseClient,
  scope: MediaGenerationScope,
  request: SoundGenerationRequest
) {
  return startMediaGenerationJob(supabase, scope, {
    mediaType: "audio",
    provider: "elevenlabs",
    prompt: request.text,
    idempotencyKey: request.idempotencyKey,
    inputMetadata: {
      mode: "sound",
      durationSeconds: request.durationSeconds,
    },
  });
}
