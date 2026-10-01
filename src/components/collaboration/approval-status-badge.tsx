import { cn } from "@/lib/utils";
import type { ApprovalStatus } from "@/lib/collaboration/types";

const LABELS: Record<ApprovalStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Changes requested",
  cancelled: "Cancelled",
};

const STYLES: Record<ApprovalStatus, string> = {
  pending: "border-amber-500/35 text-foreground",
  approved: "border-adtraxio-accent/30 text-foreground",
  rejected: "border-red-500/30 text-red-200/90",
  changes_requested: "border-border/80 text-foreground",
  cancelled: "border-border/70 text-muted-foreground",
};

export function ApprovalStatusBadge({
  status,
  className,
}: {
  status: ApprovalStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
        STYLES[status],
        className
      )}
    >
      {LABELS[status]}
    </span>
  );
}
