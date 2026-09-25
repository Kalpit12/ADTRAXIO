import { AnalyticsError } from "./errors";
import type { AnalyticsDateRange } from "./types";

export type PresetRange = "7d" | "30d" | "90d" | "custom";

export function parseDateRange(input: {
  from?: string | null;
  to?: string | null;
  preset?: PresetRange | null;
}): AnalyticsDateRange {
  if (input.preset && input.preset !== "custom") {
    return presetToRange(input.preset);
  }

  if (input.from && input.to) {
    const fromDate = parseIsoDate(input.from);
    const toDate = parseIsoDate(input.to);

    if (fromDate > toDate) {
      throw new AnalyticsError("invalid_date_range", "Start date must be before end date.");
    }

    return { from: formatDate(fromDate), to: formatDate(toDate) };
  }

  return presetToRange("30d");
}

function presetToRange(preset: Exclude<PresetRange, "custom">): AnalyticsDateRange {
  const to = new Date();
  const from = new Date();

  if (preset === "7d") from.setUTCDate(from.getUTCDate() - 6);
  if (preset === "30d") from.setUTCDate(from.getUTCDate() - 29);
  if (preset === "90d") from.setUTCDate(from.getUTCDate() - 89);

  return {
    from: formatDate(from),
    to: formatDate(to),
  };
}

function parseIsoDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AnalyticsError("invalid_date_range", "Dates must use YYYY-MM-DD format.");
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new AnalyticsError("invalid_date_range", "Invalid date.");
  }
  return date;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function previousRange(range: AnalyticsDateRange): AnalyticsDateRange {
  const from = new Date(`${range.from}T00:00:00.000Z`);
  const to = new Date(`${range.to}T00:00:00.000Z`);
  const days =
    Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  const prevTo = new Date(from);
  prevTo.setUTCDate(prevTo.getUTCDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setUTCDate(prevFrom.getUTCDate() - (days - 1));

  return {
    from: formatDate(prevFrom),
    to: formatDate(prevTo),
  };
}
