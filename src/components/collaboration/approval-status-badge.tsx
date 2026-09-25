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
  pending: "bg-amber-500/10 text-amber-300",
  approved: "bg-adtraxio-accent/15 text-adtraxio-accent",
  rejected: "bg-destructive/10 text-destructive",
  changes_requested: "bg-blue-500/10 text-blue-300",
  cancelled: "bg-secondary text-muted-foreground",
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
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[status],
        className
      )}
    >
      {LABELS[status]}
    </span>
  );
}
