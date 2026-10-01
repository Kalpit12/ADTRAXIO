import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  formatReportDate,
  formatReportDateTime,
} from "@/components/reports/format";
import {
  ReportStatusBadge,
  ReportVisibilityBadge,
} from "@/components/reports/report-status-badge";
import type { ReportListItem } from "@/lib/reporting/types";

export function ReportRow({ report }: { report: ReportListItem }) {
  return (
    <li>
      <Link
        href={`/reports/${report.id}`}
        className="group flex flex-col gap-3 border-b border-border/50 px-5 py-4 transition-colors last:border-0 hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <p className="font-medium text-foreground">{report.name}</p>
          {report.clientName && (
            <p className="mt-0.5 text-xs text-muted-foreground">{report.clientName}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground md:hidden">
            {formatReportDate(report.dateFrom)} – {formatReportDate(report.dateTo)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
          <ReportStatusBadge status={report.status} />
          <ReportVisibilityBadge visibility={report.visibility} />
          <span className="hidden text-xs text-muted-foreground lg:inline">
            {formatReportDateTime(report.lastGeneratedAt)}
          </span>
          <ChevronRight
            className="size-4 text-muted-foreground/50 group-hover:text-muted-foreground"
            aria-hidden
          />
        </div>
      </Link>
    </li>
  );
}
