export class AnalyticsError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function toClientError(error: unknown): {
  code: string;
  message: string;
  status: number;
} {
  if (error instanceof AnalyticsError) {
    return { code: error.code, message: error.message, status: error.status };
  }

  if (error instanceof Error) {
    return {
      code: "analytics_error",
      message: error.message,
      status: 502,
    };
  }

  return {
    code: "unknown_error",
    message: "Unable to complete analytics request.",
    status: 500,
  };
}
