import type { AssistantContext } from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function assertResourceOrganization(
  ctx: AssistantContext,
  organizationId: string
): boolean {
  return organizationId === ctx.organizationId;
}

export function assertClientWorkspaceMatch(
  ctx: AssistantContext,
  resourceClientWorkspaceId: string | null
): boolean {
  if (ctx.isAgency) {
    if (!ctx.clientWorkspaceId) return false;
    return resourceClientWorkspaceId === ctx.clientWorkspaceId;
  }
  return resourceClientWorkspaceId === null;
}

export function assertReportScope(
  ctx: AssistantContext,
  report: { organizationId: string; clientWorkspaceId: string }
): boolean {
  if (!assertResourceOrganization(ctx, report.organizationId)) return false;
  if (!ctx.clientWorkspaceId) return false;
  return report.clientWorkspaceId === ctx.clientWorkspaceId;
}
