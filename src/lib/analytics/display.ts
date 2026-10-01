/** Shared analytics display helpers — UI only; does not change metric semantics. */

export const METRIC_UNAVAILABLE = "Unavailable";

export function formatMetricValue(value: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString();
}

export function formatEngagementRate(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}%`;
}

export function formatChartValue(value: number | null): string {
  if (value == null) return METRIC_UNAVAILABLE;
  return value.toLocaleString();
}

export function formatShortDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatFullDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function presetLabel(preset: string): string {
  switch (preset) {
    case "7d":
      return "Last 7 days";
    case "30d":
      return "Last 30 days";
    case "90d":
      return "Last 90 days";
    case "custom":
      return "Custom range";
    default:
      return "Selected period";
  }
}
