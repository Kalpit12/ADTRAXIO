import type { ReportStatus, ReportVisibility } from "./types";

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export const REPORT_VISIBILITY_LABELS: Record<ReportVisibility, string> = {
  internal: "Internal",
  client: "Client-ready",
};

export function friendlyReportError(message: string | null | undefined): string {
  if (!message) return "Something went wrong. Try again.";
  if (message.length > 160 || /supabase|sql/i.test(message)) {
    return "Something went wrong. Try again.";
  }
  return message;
}
