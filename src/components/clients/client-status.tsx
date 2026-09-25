import { cn } from "@/lib/utils";
import type { ClientStatus } from "@/lib/workspaces/types";

const STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Active",
  archived: "Archived",
};

const STATUS_STYLES: Record<ClientStatus, string> = {
  active: "bg-adtraxio-accent/15 text-adtraxio-accent",
  archived: "bg-secondary/80 text-muted-foreground/80",
};

interface ClientStatusBadgeProps {
  status: ClientStatus;
  className?: string;
}

export function ClientStatusBadge({ status, className }: ClientStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
