type LogLevel = "info" | "warn" | "error";

export type OperationLog = {
  operation: string;
  category?: string;
  status?: number | string;
  organizationId?: string;
  clientWorkspaceId?: string | null;
  resourceId?: string;
  durationMs?: number;
  errorCode?: string;
  message?: string;
};

const SENSITIVE_KEY = /token|secret|password|authorization|cookie|api[_-]?key|refresh/i;

function sanitizeValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY.test(key)) return "[redacted]";
  if (typeof value === "string" && value.length > 500) {
    return `${value.slice(0, 500)}…`;
  }
  return value;
}

function safePayload(payload: OperationLog): Record<string, unknown> {
  const out: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level: "info",
  };
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    out[key] = sanitizeValue(key, value);
  }
  return out;
}

export function logOperation(payload: OperationLog, level: LogLevel = "info"): void {
  const line = JSON.stringify({ ...safePayload(payload), level });
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.info(line);
}

export function logRequestFailure(input: {
  operation: string;
  category: string;
  status: number;
  organizationId?: string;
  clientWorkspaceId?: string | null;
  resourceId?: string;
  message?: string;
}): void {
  logOperation(
    {
      operation: input.operation,
      category: input.category,
      status: input.status,
      organizationId: input.organizationId,
      clientWorkspaceId: input.clientWorkspaceId,
      resourceId: input.resourceId,
      message: input.message,
    },
    input.status >= 500 ? "error" : "warn"
  );
}
