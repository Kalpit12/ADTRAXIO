import {
  type PublishingStatus,
} from "@/lib/publishing/types";
import { cn } from "@/lib/utils";

const LABELS: Record<PublishingStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
  cancelled: "Cancelled",
};

const DESCRIPTIONS: Record<PublishingStatus, string> = {
  draft: "Not scheduled",
  scheduled: "Waiting for scheduled time",
  publishing: "Publishing in progress",
  published: "Successfully published",
  failed: "Publishing did not complete",
  cancelled: "Schedule was cancelled",
};

const STYLES: Record<PublishingStatus, string> = {
  draft: "border-border/70 text-muted-foreground",
  scheduled: "border-adtraxio-accent/25 text-foreground",
  publishing: "border-border/80 text-muted-foreground",
  published: "border-adtraxio-accent/30 text-foreground",
  failed: "border-red-500/30 text-red-200/90",
  cancelled: "border-border/60 text-muted-foreground",
};

interface PublishStatusBadgeProps {
  status: PublishingStatus | string;
  className?: string;
  showDescription?: boolean;
}

export function PublishStatusBadge({
  status,
  className,
  showDescription = false,
}: PublishStatusBadgeProps) {
  const key = status as PublishingStatus;
  const label = LABELS[key] ?? status;
  const description = DESCRIPTIONS[key];

  return (
    <span className={cn("inline-flex flex-col gap-0.5", className)}>
      <span
        className={cn(
          "inline-flex w-fit rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
          STYLES[key] ?? STYLES.draft
        )}
      >
        {label}
      </span>
      {showDescription && description && (
        <span className="text-[10px] text-muted-foreground">{description}</span>
      )}
    </span>
  );
}

export function friendlyPublishError(message: string | null | undefined): string {
  if (!message) return "Publishing failed. Try again or review your account connection.";
  if (
    message.length > 120 ||
    /graph\.facebook|oauth|token|meta/i.test(message)
  ) {
    return "Publishing failed. Try again or review your account connection.";
  }
  return message;
}
