"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FileText, Plus } from "lucide-react";
import {
  formatReportDate,
  formatReportDateTime,
} from "@/components/reports/format";
import {
  ReportStatusBadge,
  ReportVisibilityBadge,
} from "@/components/reports/report-status-badge";
import { AskAdtraxioLink } from "@/components/assistant/ask-adtraxio-link";
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
        code?: string;
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
      <header className="border-b border-border/60 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Reports</p>
            <h1 className="font-heading mt-1 text-3xl tracking-tight text-foreground sm:text-4xl">
              Client performance reports
            </h1>
            <AskAdtraxioLink
              variant="button"
              className="mt-4"
              label="Explain a report with ADTRAXIO AI"
              prompt="Help me understand my latest client report — summarize key metrics and recommended actions."
            />
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Build and share performance snapshots from your connected analytics
              for the selected client workspace.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/reports/new">
              <Plus className="size-3.5" />
              New report
            </Link>
          </Button>
        </div>
      </header>

      {error && (
        <p className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded-lg bg-secondary/30" />
          <div className="h-16 animate-pulse rounded-lg bg-secondary/30" />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-lg border border-border/60 px-6 py-12 text-center">
          <FileText className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No reports yet for this client workspace.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/reports/new">Create your first report</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/60">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/60 bg-secondary/20 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Report</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Period</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Visibility</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Last generated</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
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
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {formatReportDate(report.dateFrom)} – {formatReportDate(report.dateTo)}
                  </td>
                  <td className="px-4 py-3">
                    <ReportStatusBadge status={report.status} />
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <ReportVisibilityBadge visibility={report.visibility} />
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                    {formatReportDateTime(report.lastGeneratedAt)}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                    {formatReportDateTime(report.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
