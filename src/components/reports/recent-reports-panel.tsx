"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { formatReportDate } from "@/components/reports/format";
import { ReportStatusBadge } from "@/components/reports/report-status-badge";
import type { ReportListItem } from "@/lib/reporting/types";

export function RecentReportsPanel() {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then(async (res) => {
        if (!res.ok) return [];
        const payload = (await res.json()) as { reports?: ReportListItem[] };
        return (payload.reports ?? []).filter((r) => r.status !== "archived").slice(0, 4);
      })
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-24 animate-pulse rounded-lg bg-secondary/30" />;
  }

  if (reports.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Reports</p>
          <h2 className="font-heading mt-1 text-xl tracking-tight">Recent reports</h2>
        </div>
        <Link href="/reports" className="text-xs text-adtraxio-accent hover:underline">
          View all
        </Link>
      </div>
      <div className="divide-y divide-border/60 rounded-lg border border-border/60">
        {reports.map((report) => (
          <Link
            key={report.id}
            href={`/reports/${report.id}`}
            className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-white/[0.02]"
          >
            <div className="flex min-w-0 items-start gap-3">
              <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{report.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatReportDate(report.dateFrom)} – {formatReportDate(report.dateTo)}
                </p>
              </div>
            </div>
            <ReportStatusBadge status={report.status} />
          </Link>
        ))}
      </div>
    </section>
  );
}
