"use client";

import Link from "next/link";
import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status";
import {
  CAMPAIGN_OBJECTIVE_LABELS,
  type CAMPAIGN_OBJECTIVES,
} from "@/lib/campaigns/constants";
import type { CampaignRecord } from "@/lib/campaigns/types";
import { cn } from "@/lib/utils";

type CampaignObjective = (typeof CAMPAIGN_OBJECTIVES)[number];

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatPeriod(start: string | null, end: string | null): string {
  if (!start && !end) return "—";
  return `${formatDate(start)} – ${formatDate(end)}`;
}

interface CampaignRowProps {
  campaign: CampaignRecord;
  className?: string;
}

export function CampaignRow({ campaign, className }: CampaignRowProps) {
  const objectiveLabel =
    campaign.objective != null
      ? CAMPAIGN_OBJECTIVE_LABELS[campaign.objective as CampaignObjective]
      : "—";

  return (
    <tr
      className={cn(
        "border-b border-border/50 transition-colors hover:bg-white/[0.02]",
        className
      )}
    >
      <td className="py-4 pr-4">
        <Link
          href={`/campaigns/${campaign.id}`}
          className="font-medium text-foreground transition-colors hover:text-adtraxio-accent"
        >
          {campaign.name}
        </Link>
      </td>
      <td className="py-4 pr-4 text-muted-foreground">{objectiveLabel}</td>
      <td className="py-4 pr-4">
        <CampaignStatusBadge status={campaign.status} />
      </td>
      <td className="hidden py-4 pr-4 text-xs text-muted-foreground md:table-cell">
        {formatPeriod(campaign.startDate, campaign.endDate)}
      </td>
      <td className="py-4 pr-4 tabular-nums text-muted-foreground">
        {campaign.contentCount ?? 0}
      </td>
      <td className="py-4">
        <div className="flex items-center gap-1.5">
          {(campaign.platforms ?? []).length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            campaign.platforms?.map((platform) => (
              <PlatformIcon
                key={platform}
                platform={platform as "instagram" | "facebook"}
                className="size-4"
              />
            ))
          )}
        </div>
      </td>
    </tr>
  );
}

export function CampaignCard({ campaign }: { campaign: CampaignRecord }) {
  const objectiveLabel =
    campaign.objective != null
      ? CAMPAIGN_OBJECTIVE_LABELS[campaign.objective as CampaignObjective]
      : "—";

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="block py-4 transition-colors hover:bg-white/[0.02]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{campaign.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{objectiveLabel}</p>
        </div>
        <CampaignStatusBadge status={campaign.status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>{campaign.contentCount ?? 0} content</span>
        <span>{formatPeriod(campaign.startDate, campaign.endDate)}</span>
      </div>
    </Link>
  );
}
