export const MEDIA_ERROR_CATEGORIES = [
  "configuration_error",
  "authentication_error",
  "rate_limited",
  "invalid_request",
  "content_policy",
  "timeout",
  "provider_error",
  "storage_error",
  "unknown_error",
] as const;

export type MediaErrorCategory = (typeof MEDIA_ERROR_CATEGORIES)[number];

export class MediaGenerationError extends Error {
  readonly category: MediaErrorCategory;
  readonly status: number;
  readonly logDetail?: string;

  constructor(
    category: MediaErrorCategory,
    message: string,
    options?: { status?: number; logDetail?: string; cause?: unknown }
  ) {
    super(message);
    this.name = "MediaGenerationError";
    this.category = category;
    this.status = options?.status ?? categoryToHttpStatus(category);
    this.logDetail = options?.logDetail;
    if (options?.cause instanceof Error) {
      this.cause = options.cause;
    }
  }
}

function categoryToHttpStatus(category: MediaErrorCategory): number {
  switch (category) {
    case "configuration_error":
      return 503;
    case "authentication_error":
      return 502;
    case "rate_limited":
      return 429;
    case "invalid_request":
      return 400;
    case "content_policy":
      return 422;
    case "timeout":
      return 504;
    case "storage_error":
      return 500;
    case "provider_error":
      return 502;
    default:
      return 500;
  }
}

export function safeUserMessage(category: MediaErrorCategory): string {
  switch (category) {
    case "configuration_error":
      return "Media generation is not configured yet.";
    case "authentication_error":
      return "Media provider authentication failed.";
    case "rate_limited":
      return "Media generation is temporarily rate limited. Try again shortly.";
    case "invalid_request":
      return "The media request was invalid.";
    case "content_policy":
      return "The request was blocked by content policy.";
    case "timeout":
      return "Media generation timed out.";
    case "storage_error":
      return "Unable to store generated media.";
    case "provider_error":
      return "Media generation failed.";
    default:
      return "Something went wrong during media generation.";
  }
}

export function normalizeProviderError(
  provider: "openai" | "google" | "elevenlabs",
  error: unknown,
  context?: { httpStatus?: number; bodySnippet?: string }
): MediaGenerationError {
  if (error instanceof MediaGenerationError) {
    return error;
  }

  const status = context?.httpStatus;
  const body = (context?.bodySnippet ?? "").toLowerCase();

  if (error instanceof Error && error.name === "AbortError") {
    return new MediaGenerationError("timeout", safeUserMessage("timeout"), {
      logDetail: `${provider}: request aborted`,
      cause: error,
    });
  }

  if (status === 401 || status === 403 || body.includes("invalid api key")) {
    return new MediaGenerationError(
      "authentication_error",
      safeUserMessage("authentication_error"),
      { status: status ?? 502, logDetail: `${provider}: auth failure` }
    );
  }

  if (status === 429 || body.includes("rate limit")) {
    return new MediaGenerationError("rate_limited", safeUserMessage("rate_limited"), {
      status: 429,
      logDetail: `${provider}: rate limited`,
    });
  }

  if (
    status === 400 ||
    body.includes("invalid") ||
    body.includes("validation") ||
    body.includes("bad request")
  ) {
    return new MediaGenerationError("invalid_request", safeUserMessage("invalid_request"), {
      status: 400,
      logDetail: `${provider}: invalid request`,
    });
  }

  if (
    body.includes("content policy") ||
    body.includes("safety") ||
    body.includes("moderation") ||
    status === 422
  ) {
    return new MediaGenerationError("content_policy", safeUserMessage("content_policy"), {
      status: 422,
      logDetail: `${provider}: content policy`,
    });
  }

  if (error instanceof Error && /not configured/i.test(error.message)) {
    return new MediaGenerationError("configuration_error", safeUserMessage("configuration_error"), {
      logDetail: error.message,
    });
  }

  return new MediaGenerationError("provider_error", safeUserMessage("provider_error"), {
    status: status ?? 502,
    logDetail: `${provider}: ${error instanceof Error ? error.message : "unknown"}`,
    cause: error instanceof Error ? error : undefined,
  });
}

export function toPublicError(error: unknown): {
  error: string;
  category: MediaErrorCategory;
  status: number;
} {
  if (error instanceof MediaGenerationError) {
    return {
      error: error.message,
      category: error.category,
      status: error.status,
    };
  }
  return {
    error: safeUserMessage("unknown_error"),
    category: "unknown_error",
    status: 500,
  };
}
