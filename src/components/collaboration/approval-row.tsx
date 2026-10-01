import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatActivityAction } from "@/lib/collaboration/display";
import type { ActivityLogEntry } from "@/lib/collaboration/types";
import type { NotificationRecord } from "@/lib/collaboration/types";

function notificationTypeLabel(type: string): string {
  const map: Record<string, string> = {
    approval_requested: "Review requested",
    reviewer_assigned: "Assigned to you",
    approval_approved: "Approved",
    approval_rejected: "Rejected",
    approval_changes_requested: "Changes requested",
    campaign_review_requested: "Campaign review",
  };
  return map[type] ?? "Approval update";
}

export function ApprovalNotificationRow({
  item,
  onMarkRead,
}: {
  item: NotificationRecord;
  onMarkRead?: () => void;
}) {
  return (
    <li className="border-b border-border/50 px-4 py-4 last:border-0 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {notificationTypeLabel(item.type)}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{item.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(item.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {!item.readAt && onMarkRead && (
            <button
              type="button"
              onClick={onMarkRead}
              className="text-xs font-medium text-foreground underline-offset-2 hover:underline"
            >
              Mark read
            </button>
          )}
          <Link
            href="/notifications"
            className="inline-flex items-center gap-1 text-xs font-medium text-adtraxio-accent hover:underline"
          >
            Details
            <ChevronRight className="size-3" aria-hidden />
          </Link>
        </div>
      </div>
    </li>
  );
}

export function ApprovalActivityRow({
  entry,
  href,
  hrefLabel,
}: {
  entry: ActivityLogEntry;
  href?: string | null;
  hrefLabel?: string;
}) {
  return (
    <li className="border-b border-border/50 px-4 py-4 last:border-0 sm:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            {formatActivityAction(entry.action)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(entry.createdAt).toLocaleString()}
          </p>
        </div>
        {href && hrefLabel && (
          <Link
            href={href}
            className="text-xs font-medium text-adtraxio-accent hover:underline"
          >
            {hrefLabel}
          </Link>
        )}
      </div>
    </li>
  );
}
