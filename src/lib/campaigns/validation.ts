import { CAMPAIGN_OBJECTIVES, CAMPAIGN_STATUSES } from "./constants";
import type { CampaignObjective, CampaignStatus } from "./types";

export class CampaignValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CampaignValidationError";
  }
}

export function validateCampaignName(name: unknown): string {
  if (typeof name !== "string" || !name.trim()) {
    throw new CampaignValidationError("Campaign name is required.");
  }
  return name.trim();
}

export function validateObjective(objective: unknown): CampaignObjective {
  if (
    typeof objective !== "string" ||
    !CAMPAIGN_OBJECTIVES.includes(objective as CampaignObjective)
  ) {
    throw new CampaignValidationError("Invalid campaign objective.");
  }
  return objective as CampaignObjective;
}

export function validateStatus(status: unknown): CampaignStatus {
  if (
    typeof status !== "string" ||
    !CAMPAIGN_STATUSES.includes(status as CampaignStatus)
  ) {
    throw new CampaignValidationError("Invalid campaign status.");
  }
  return status as CampaignStatus;
}

export function validateOptionalDate(
  value: unknown,
  label: string
): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new CampaignValidationError(`${label} must use YYYY-MM-DD format.`);
  }
  return value;
}

export function validateDateRange(
  startDate: string | null,
  endDate: string | null
): void {
  if (startDate && endDate && endDate < startDate) {
    throw new CampaignValidationError("End date must be on or after start date.");
  }
}

export function parseCreateCampaignBody(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new CampaignValidationError("Invalid request body.");
  }

  const input = body as Record<string, unknown>;
  const name = validateCampaignName(input.name);
  const objective = validateObjective(input.objective);
  const startDate = validateOptionalDate(input.startDate, "Start date");
  const endDate = validateOptionalDate(input.endDate, "End date");
  validateDateRange(startDate, endDate);

  const status =
    input.status != null ? validateStatus(input.status) : ("draft" as const);

  const socialAccountIds = Array.isArray(input.socialAccountIds)
    ? input.socialAccountIds.filter((id): id is string => typeof id === "string")
    : [];

  return {
    name,
    description:
      typeof input.description === "string" ? input.description.trim() : null,
    objective,
    status,
    startDate,
    endDate,
    socialAccountIds,
  };
}

export function parseUpdateCampaignBody(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new CampaignValidationError("Invalid request body.");
  }

  const input = body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if (input.name !== undefined) {
    updates.name = validateCampaignName(input.name);
  }
  if (input.objective !== undefined) {
    updates.objective = validateObjective(input.objective);
  }
  if (input.status !== undefined) {
    updates.status = validateStatus(input.status);
  }
  if (input.description !== undefined) {
    updates.description =
      typeof input.description === "string" ? input.description.trim() : null;
  }
  if (input.startDate !== undefined) {
    updates.startDate = validateOptionalDate(input.startDate, "Start date");
  }
  if (input.endDate !== undefined) {
    updates.endDate = validateOptionalDate(input.endDate, "End date");
  }

  if (
    updates.startDate !== undefined ||
    updates.endDate !== undefined
  ) {
    validateDateRange(
      (updates.startDate as string | null) ?? null,
      (updates.endDate as string | null) ?? null
    );
  }

  return updates;
}
