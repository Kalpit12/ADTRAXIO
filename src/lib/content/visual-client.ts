import type { GenerationStatus, PublicGenerationJob } from "@/lib/ai/media/types";

export type VisualGenerationPhase =
  | "idle"
  | "generating"
  | "processing"
  | "completed"
  | "failed";

export async function requestImageGeneration(body: {
  prompt: string;
  size?: string;
  idempotencyKey?: string;
}): Promise<
  | { job: PublicGenerationJob }
  | { error: string; category?: string; status: number }
> {
  const response = await fetch("/api/ai/media/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return parseJobStartResponse(response, "image");
}

export async function requestVideoGeneration(body: {
  prompt: string;
  aspectRatio?: string;
  durationSeconds?: number;
  idempotencyKey?: string;
}): Promise<
  | { job: PublicGenerationJob }
  | { error: string; category?: string; status: number }
> {
  const response = await fetch("/api/ai/media/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return parseJobStartResponse(response, "video");
}

async function parseJobStartResponse(
  response: Response,
  kind: "image" | "video" | "audio"
): Promise<
  | { job: PublicGenerationJob }
  | { error: string; category?: string; status: number }
> {
  const payload = (await response.json()) as {
    job?: PublicGenerationJob;
    error?: string;
    category?: string;
  };

  if (!response.ok) {
    return {
      error:
        payload.error ??
        (kind === "video"
          ? "Unable to start video generation."
          : kind === "audio"
            ? "Unable to start audio generation."
            : "Unable to start image generation."),
      category: payload.category,
      status: response.status,
    };
  }

  if (!payload.job) {
    return {
      error: `Invalid response from ${kind} service.`,
      status: 500,
    };
  }

  return { job: payload.job };
}

export async function pollGenerationJob(
  jobId: string
): Promise<
  | { job: PublicGenerationJob }
  | { error: string; category?: string; status: number }
> {
  const response = await fetch(`/api/ai/media/jobs/${jobId}`);
  const payload = (await response.json()) as {
    job?: PublicGenerationJob;
    error?: string;
    category?: string;
  };

  if (!response.ok) {
    return {
      error: payload.error ?? "Unable to check generation status.",
      category: payload.category,
      status: response.status,
    };
  }

  if (!payload.job) {
    return { error: "Job not found.", status: 404 };
  }

  return { job: payload.job };
}

export async function fetchSignedAssetUrl(assetId: string): Promise<string | null> {
  const response = await fetch(`/api/ai/media/assets/${assetId}/url`);
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as { url?: string };
  return payload.url ?? null;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

export async function waitForMediaJob(
  jobId: string,
  options?: {
    intervalMs?: number;
    maxAttempts?: number;
    signal?: AbortSignal;
    onStatus?: (status: GenerationStatus) => void;
    timeoutMessage?: string;
  }
): Promise<
  | { assetId: string; job: PublicGenerationJob }
  | { error: string; category?: string }
> {
  const intervalMs = options?.intervalMs ?? 2000;
  const maxAttempts = options?.maxAttempts ?? 90;
  const timeoutMessage =
    options?.timeoutMessage ??
    "Creation is taking longer than expected. Try again.";

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (options?.signal?.aborted) {
      return { error: "Generation was cancelled." };
    }

    let result = await pollGenerationJob(jobId);
    if ("error" in result) {
      if (result.status >= 500 && attempt < maxAttempts - 1) {
        await sleep(intervalMs, options?.signal);
        continue;
      }
      return { error: result.error, category: result.category };
    }

    const job = result.job;
    options?.onStatus?.(job.status);

    if (job.status === "completed" && job.mediaAssetId) {
      return { assetId: job.mediaAssetId, job };
    }
    if (job.status === "failed") {
      return {
        error: job.errorMessage ?? "Generation failed.",
        category: job.errorCategory ?? undefined,
      };
    }
    if (job.status === "cancelled") {
      return { error: "Generation was cancelled." };
    }

    await sleep(intervalMs, options?.signal);
  }

  return { error: timeoutMessage };
}

export async function waitForImageJob(
  jobId: string,
  options?: { intervalMs?: number; maxAttempts?: number; signal?: AbortSignal }
): Promise<
  | { assetId: string; job: PublicGenerationJob }
  | { error: string; category?: string }
> {
  return waitForMediaJob(jobId, {
    ...options,
    timeoutMessage: "Image creation is taking longer than expected. Try again.",
  });
}

export async function waitForVideoJob(
  jobId: string,
  options?: {
    intervalMs?: number;
    maxAttempts?: number;
    signal?: AbortSignal;
    onStatus?: (status: GenerationStatus) => void;
  }
): Promise<
  | { assetId: string; job: PublicGenerationJob }
  | { error: string; category?: string }
> {
  return waitForMediaJob(jobId, {
    intervalMs: options?.intervalMs ?? 3000,
    maxAttempts: options?.maxAttempts ?? 120,
    signal: options?.signal,
    onStatus: options?.onStatus,
    timeoutMessage: "Video creation is taking longer than expected. Try again.",
  });
}

export async function requestSpeechGeneration(body: {
  text: string;
  voiceId?: string;
  idempotencyKey?: string;
}): Promise<
  | { job: PublicGenerationJob }
  | { error: string; category?: string; status: number }
> {
  const response = await fetch("/api/ai/media/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJobStartResponse(response, "audio");
}

export async function requestSoundGeneration(body: {
  text: string;
  durationSeconds?: number;
  idempotencyKey?: string;
}): Promise<
  | { job: PublicGenerationJob }
  | { error: string; category?: string; status: number }
> {
  const response = await fetch("/api/ai/media/sound", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJobStartResponse(response, "audio");
}

export async function waitForAudioJob(
  jobId: string,
  options?: {
    intervalMs?: number;
    maxAttempts?: number;
    signal?: AbortSignal;
    onStatus?: (status: GenerationStatus) => void;
    timeoutMessage?: string;
  }
): Promise<
  | { assetId: string; job: PublicGenerationJob }
  | { error: string; category?: string }
> {
  return waitForMediaJob(jobId, {
    intervalMs: options?.intervalMs ?? 2000,
    maxAttempts: options?.maxAttempts ?? 60,
    signal: options?.signal,
    onStatus: options?.onStatus,
    timeoutMessage:
      options?.timeoutMessage ??
      "Audio creation is taking longer than expected. Try again.",
  });
}
