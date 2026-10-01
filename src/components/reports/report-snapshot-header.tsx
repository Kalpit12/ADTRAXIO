import {
  formatReportDate,
  formatReportDateTime,
} from "@/components/reports/format";
import type { ReportSnapshotData } from "@/lib/reporting/types";

export function ReportSnapshotHeader({ snapshot }: { snapshot: ReportSnapshotData }) {
  return (
    <header className="space-y-4 border-b border-border/60 pb-8 print:border-black/20">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {snapshot.client.name}
      </p>
      <h1 className="font-heading text-3xl tracking-tight text-foreground sm:text-4xl print:text-black">
        {snapshot.report.name}
      </h1>
      {snapshot.report.description && (
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground print:text-black/70">
          {snapshot.report.description}
        </p>
      )}
      <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Reporting period
          </dt>
          <dd className="mt-0.5 text-foreground print:text-black">
            {formatReportDate(snapshot.period.from)} –{" "}
            {formatReportDate(snapshot.period.to)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Snapshot generated
          </dt>
          <dd className="mt-0.5 text-foreground print:text-black">
            {formatReportDateTime(snapshot.generatedAt)}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground print:text-black/60">
        This report reflects analytics captured for the period above — not a live
        data feed.
      </p>
    </header>
  );
}
