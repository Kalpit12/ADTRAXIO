import type { ClientRole } from "@/lib/workspaces/types";
import type { ReportPermission, ReportRecord, ReportVisibility } from "./types";

const ROLE_PERMISSIONS: Record<ClientRole, ReportPermission[]> = {
  owner: [
    "report_view",
    "report_create",
    "report_edit",
    "report_publish",
    "report_archive",
  ],
  manager: [
    "report_view",
    "report_create",
    "report_edit",
    "report_publish",
    "report_archive",
  ],
  editor: ["report_view", "report_create", "report_edit"],
  viewer: ["report_view"],
};

export function hasReportPermission(
  permission: ReportPermission,
  options: {
    clientRole: ClientRole | null;
    orgRole: string | null;
    isAgency: boolean;
  }
): boolean {
  if (options.orgRole === "owner") return true;
  if (!options.isAgency) {
    return permission !== "report_archive" || options.orgRole === "owner";
  }
  if (!options.clientRole) return false;
  return ROLE_PERMISSIONS[options.clientRole].includes(permission);
}

export function requireReportPermission(
  permission: ReportPermission,
  options: {
    clientRole: ClientRole | null;
    orgRole: string | null;
    isAgency: boolean;
  }
): void {
  if (!hasReportPermission(permission, options)) {
    throw new Error("You do not have permission for this action.");
  }
}

/** Whether the user may see this report in lists/detail. */
export function canAccessReport(
  report: Pick<ReportRecord, "status" | "visibility">,
  options: {
    clientRole: ClientRole | null;
    orgRole: string | null;
    isAgency: boolean;
  }
): boolean {
  if (report.status === "archived") {
    return hasReportPermission("report_edit", options);
  }

  if (report.status === "draft") {
    return hasReportPermission("report_edit", options);
  }

  if (report.visibility === "client") {
    return hasReportPermission("report_view", options);
  }

  return hasReportPermission("report_edit", options);
}

export function isClientVisibleReport(
  report: Pick<ReportRecord, "status" | "visibility">
): boolean {
  return report.status === "published" && report.visibility === "client";
}

export function filterReportsForViewer<
  T extends Pick<ReportRecord, "status" | "visibility">
>(reports: T[], options: Parameters<typeof canAccessReport>[1]): T[] {
  return reports.filter((report) => canAccessReport(report, options));
}

export function canSetVisibility(
  visibility: ReportVisibility,
  options: {
    clientRole: ClientRole | null;
    orgRole: string | null;
    isAgency: boolean;
  }
): boolean {
  if (visibility === "internal") return hasReportPermission("report_edit", options);
  return hasReportPermission("report_publish", options);
}
