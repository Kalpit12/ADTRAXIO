import { cn } from "@/lib/utils";

export type ActionVisualStatus =
  | "draft"
  | "ready"
  | "pending"
  | "approved"
  | "executing"
  | "completed"
  | "failed"
  | "rolled_back";

const LABELS: Record<ActionVisualStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  pending: "Pending approval",
  approved: "Approved",
  executing: "Executing",
  completed: "Completed",
  failed: "Failed",
  rolled_back: "Rolled back",
};

interface ActionStatusBadgeProps {
  status: ActionVisualStatus;
  className?: string;
}

export function ActionStatusBadge({ status, className }: ActionStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
        status === "pending" && "border-border/80 text-muted-foreground",
        status === "ready" && "border-adtraxio-accent/30 text-foreground",
        status === "approved" && "border-border/80 text-foreground",
        status === "executing" && "border-border/80 text-muted-foreground",
        status === "completed" && "border-adtraxio-accent/25 text-foreground",
        status === "failed" && "border-red-500/30 text-red-300/90",
        status === "draft" && "border-border/60 text-muted-foreground",
        status === "rolled_back" && "border-border/60 text-muted-foreground",
        className
      )}
    >
      {LABELS[status]}
    </span>
  );
}

/** Map pending-action API status to visual badge. */
export function pendingActionVisualStatus(
  status: "pending" | "confirmed" | "cancelled" | "expired"
): ActionVisualStatus {
  switch (status) {
    case "pending":
      return "pending";
    case "confirmed":
      return "completed";
    case "cancelled":
      return "draft";
    case "expired":
      return "failed";
    default:
      return "ready";
  }
}
