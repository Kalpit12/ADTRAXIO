"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { ReportEmptyState } from "@/components/reports/report-empty-state";
import { ReportError } from "@/components/reports/report-error";
import { ReportListSkeleton } from "@/components/reports/report-skeleton";
import { ReportRow } from "@/components/reports/report-row";
import {
  formatReportDate,
  formatReportDateTime,
} from "@/components/reports/format";
import {
  ReportStatusBadge,
  ReportVisibilityBadge,
} from "@/components/reports/report-status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import type { ReportListItem } from "@/lib/reporting/types";

export function ReportsView() {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/reports");
      const payload = (await response.json()) as {
        reports?: ReportListItem[];
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Unable to load reports.");
        return;
      }

      setReports(payload.reports ?? []);
    } catch {
      setError("Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Client reports"
        description="Turn campaign and growth data into clear, client-ready reporting — a presentation layer, not your live analytics dashboard."
      >
        <Button asChild size="sm">
          <Link href="/reports/new">
            <Plus className="size-3.5" />
            Create report
          </Link>
        </Button>
      </PageHeader>

      <p className="text-xs text-muted-foreground">
        For operational metrics and exploration, use{" "}
        <Link href="/analytics" className="font-medium text-foreground hover:underline">
          Analytics
        </Link>
        . Reports capture a snapshot for sharing.
      </p>

      {error && <ReportError message={error} onRetry={() => void loadReports()} />}

      {loading ? (
        <ReportListSkeleton />
      ) : reports.length === 0 ? (
        <ReportEmptyState />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-md border border-border/60 md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-adtraxio-surface/10 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Report</th>
                  <th className="px-5 py-3">Period</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="hidden px-5 py-3 sm:table-cell">Audience</th>
                  <th className="hidden px-5 py-3 lg:table-cell">Last snapshot</th>
                  <th className="hidden px-5 py-3 lg:table-cell">Updated</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-b border-border/40 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <Link
                        href={`/reports/${report.id}`}
                        className="font-medium text-foreground hover:text-adtraxio-accent"
                      >
                        {report.name}
                      </Link>
                      {report.clientName && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {report.clientName}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {formatReportDate(report.dateFrom)} – {formatReportDate(report.dateTo)}
                    </td>
                    <td className="px-5 py-3">
                      <ReportStatusBadge status={report.status} />
                    </td>
                    <td className="hidden px-5 py-3 sm:table-cell">
                      <ReportVisibilityBadge visibility={report.visibility} />
                    </td>
                    <td className="hidden px-5 py-3 text-muted-foreground lg:table-cell">
                      {formatReportDateTime(report.lastGeneratedAt)}
                    </td>
                    <td className="hidden px-5 py-3 text-muted-foreground lg:table-cell">
                      {formatReportDateTime(report.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden">
            {reports.map((report) => (
              <ReportRow key={report.id} report={report} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
