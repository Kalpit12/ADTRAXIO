export class PublishingError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function normalizeMetaError(error: unknown): PublishingError {
  if (error instanceof PublishingError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("permission") || message.includes("oauth")) {
      return new PublishingError(
        "permission_denied",
        "This account does not have publishing permission. Reconnect the account with publish access.",
        403
      );
    }

    if (message.includes("rate limit")) {
      return new PublishingError(
        "rate_limited",
        "Meta rate limit reached. Try again later.",
        429
      );
    }

    if (message.includes("media") || message.includes("image")) {
      return new PublishingError(
        "invalid_media",
        error.message,
        400
      );
    }

    return new PublishingError("meta_api_error", error.message, 502);
  }

  return new PublishingError(
    "meta_api_error",
    "Unable to publish through Meta.",
    502
  );
}

export function toClientError(error: unknown): { code: string; message: string; status: number } {
  if (error instanceof PublishingError) {
    return { code: error.code, message: error.message, status: error.status };
  }

  if (
    error instanceof Error &&
    error.name === "CollaborationError" &&
    "code" in error &&
    "status" in error
  ) {
    return {
      code: String((error as { code: string }).code),
      message: error.message,
      status: Number((error as { status: number }).status),
    };
  }

  return {
    code: "unknown_error",
    message: "Unable to complete publishing request.",
    status: 500,
  };
}
