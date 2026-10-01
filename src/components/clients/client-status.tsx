import { CLIENT_STATUS_LABELS } from "@/lib/workspaces/display";
import type { ClientStatus } from "@/lib/workspaces/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<ClientStatus, string> = {
  active: "border-adtraxio-accent/30 text-foreground",
  archived: "border-border/70 text-muted-foreground",
};

interface ClientStatusBadgeProps {
  status: ClientStatus;
  className?: string;
}

export function ClientStatusBadge({ status, className }: ClientStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
        STATUS_STYLES[status],
        className
      )}
    >
      {CLIENT_STATUS_LABELS[status]}
    </span>
  );
}
