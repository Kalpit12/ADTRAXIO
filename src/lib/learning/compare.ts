import type {
  ComparisonJson,
  MetricAvailability,
  MetricComparisonRow,
  MetricSnapshot,
} from "./types";

const METRIC_KEYS: Array<{
  key: keyof MetricSnapshot;
  label: string;
}> = [
  { key: "impressions", label: "Impressions" },
  { key: "reach", label: "Reach" },
  { key: "engagement", label: "Engagement" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "shares", label: "Shares" },
  { key: "saves", label: "Saves" },
  { key: "views", label: "Views" },
  { key: "postsPublished", label: "Posts published" },
  { key: "publishingFrequencyPerWeek", label: "Publishing frequency / week" },
  { key: "campaignActiveCount", label: "Active campaigns" },
];

function compareValue(
  baseline: number | null,
  outcome: number | null
): Pick<MetricComparisonRow, "absoluteChange" | "percentChange" | "availability"> {
  if (baseline === null && outcome === null) {
    return { absoluteChange: null, percentChange: null, availability: "unavailable" };
  }
  if (baseline === null || outcome === null) {
    return { absoluteChange: null, percentChange: null, availability: "insufficient_sample" };
  }
  const absoluteChange = outcome - baseline;
  if (baseline === 0) {
    return {
      absoluteChange,
      percentChange: null,
      availability: "measured",
    };
  }
  const percentChange = Number(((absoluteChange / baseline) * 100).toFixed(1));
  return {
    absoluteChange,
    percentChange,
    availability: "measured",
  };
}

export function compareSnapshots(
  baseline: MetricSnapshot,
  outcome: MetricSnapshot
): ComparisonJson {
  const rows: MetricComparisonRow[] = [];

  for (const { key, label } of METRIC_KEYS) {
    const b = baseline[key];
    const o = outcome[key];
    if (typeof b !== "number" && typeof o !== "number" && b !== null && o !== null) {
      continue;
    }
    const baseNum = typeof b === "number" ? b : b === null ? null : null;
    const outNum = typeof o === "number" ? o : o === null ? null : null;
    const cmp = compareValue(baseNum, outNum);
    if (cmp.availability === "unavailable" && baseNum === null && outNum === null) {
      rows.push({
        metric: label,
        baseline: null,
        outcome: null,
        ...cmp,
      });
      continue;
    }
    rows.push({
      metric: label,
      baseline: baseNum,
      outcome: outNum,
      ...cmp,
    });
  }

  const measuredCount = rows.filter((r) => r.availability === "measured").length;
  let overallAvailability: MetricAvailability = "unavailable";
  if (measuredCount >= 3) overallAvailability = "measured";
  else if (measuredCount > 0) overallAvailability = "insufficient_sample";

  return {
    version: 1,
    rows,
    overallAvailability,
    summaryNote:
      measuredCount === 0
        ? "No comparable metrics available for baseline and outcome."
        : undefined,
  };
}
