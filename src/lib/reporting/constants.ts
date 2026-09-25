import type { ReportStatus, ReportVisibility } from "./types";

export const REPORT_STATUSES: ReportStatus[] = ["draft", "published", "archived"];
export const REPORT_VISIBILITIES: ReportVisibility[] = ["internal", "client"];

export const REPORT_PLATFORMS = ["instagram", "facebook"] as const;

export const SNAPSHOT_DATA_VERSION = 1 as const;
