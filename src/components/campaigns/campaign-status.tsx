import {
  CAMPAIGN_STATUS_LABELS,
  type CAMPAIGN_STATUSES,
} from "@/lib/campaigns/constants";
import { cn } from "@/lib/utils";

type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: "bg-secondary text-muted-foreground",
  active: "bg-adtraxio-accent/15 text-adtraxio-accent",
  paused: "bg-amber-500/10 text-amber-300",
  completed: "bg-blue-500/10 text-blue-300",
  archived: "bg-secondary/80 text-muted-foreground/80",
};

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
  className?: string;
}

export function CampaignStatusBadge({ status, className }: CampaignStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
        className
      )}
    >
      {CAMPAIGN_STATUS_LABELS[status]}
    </span>
  );
}
