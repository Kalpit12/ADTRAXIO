import {
  CAMPAIGN_STATUS_LABELS,
  type CAMPAIGN_STATUSES,
} from "@/lib/campaigns/constants";
import { cn } from "@/lib/utils";

type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: "border-border/70 text-muted-foreground",
  active: "border-adtraxio-accent/30 text-foreground",
  paused: "border-amber-500/25 text-foreground/90",
  completed: "border-border/80 text-foreground",
  archived: "border-border/50 text-muted-foreground/80",
};

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
  className?: string;
}

export function CampaignStatusBadge({ status, className }: CampaignStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
        STATUS_STYLES[status],
        className
      )}
    >
      {CAMPAIGN_STATUS_LABELS[status]}
    </span>
  );
}
