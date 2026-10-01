import {
  REPORT_STATUS_LABELS,
  REPORT_VISIBILITY_LABELS,
} from "@/lib/reporting/display";
import type { ReportStatus, ReportVisibility } from "@/lib/reporting/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<ReportStatus, string> = {
  draft: "border-border/70 text-muted-foreground",
  published: "border-adtraxio-accent/30 text-foreground",
  archived: "border-border/60 text-muted-foreground",
};

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
        STATUS_STYLES[status]
      )}
    >
      {REPORT_STATUS_LABELS[status]}
    </span>
  );
}

export function ReportVisibilityBadge({
  visibility,
}: {
  visibility: ReportVisibility;
}) {
  return (
    <span className="inline-flex rounded border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
      {REPORT_VISIBILITY_LABELS[visibility]}
    </span>
  );
}
