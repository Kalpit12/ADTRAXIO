import { cn } from "@/lib/utils";
import type { ReportStatus, ReportVisibility } from "@/lib/reporting/types";

const STATUS_STYLES: Record<ReportStatus, string> = {
  draft: "border-border/60 bg-secondary/40 text-muted-foreground",
  published: "border-adtraxio-accent/30 bg-adtraxio-accent/10 text-adtraxio-accent",
  archived: "border-border/60 bg-secondary/20 text-muted-foreground",
};

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
        STATUS_STYLES[status]
      )}
    >
      {status}
    </span>
  );
}

export function ReportVisibilityBadge({
  visibility,
}: {
  visibility: ReportVisibility;
}) {
  return (
    <span className="inline-flex rounded-full border border-border/60 bg-secondary/30 px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
      {visibility}
    </span>
  );
}
