import type { ExecutionAuditEntry, ExecutionPlanJson } from "./types";

export function appendAuditEntry(
  plan: ExecutionPlanJson,
  entry: Omit<ExecutionAuditEntry, "at"> & { at?: string }
): ExecutionPlanJson {
  const log = [...(plan.auditLog ?? [])];
  log.push({
    ...entry,
    at: entry.at ?? new Date().toISOString(),
  });
  if (log.length > 100) log.splice(0, log.length - 100);
  return { ...plan, auditLog: log };
}
