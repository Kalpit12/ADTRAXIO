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
    year: "numeric",
  });
}

function formatMetric(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString();
}

interface CampaignRowProps {
  campaign: CampaignRecord;
  performance?: {
    impressions: number | null;
    reach: number | null;
    engagement: number | null;
  } | null;
  className?: string;
}

export function CampaignRow({ campaign, performance, className }: CampaignRowProps) {
  const objectiveLabel =
    campaign.objective != null
      ? CAMPAIGN_OBJECTIVE_LABELS[campaign.objective as CampaignObjective]
      : "—";

  return (
    <tr className={cn("border-b border-border/50 last:border-0", className)}>
      <td className="py-3.5 pr-4">
        <Link
          href={`/campaigns/${campaign.id}`}
          className="font-medium text-foreground transition-colors hover:text-adtraxio-accent"
        >
          {campaign.name}
        </Link>
      </td>
      <td className="py-3.5 pr-4 text-muted-foreground">{objectiveLabel}</td>
      <td className="py-3.5 pr-4">
        <CampaignStatusBadge status={campaign.status} />
      </td>
      <td className="hidden py-3.5 pr-4 text-muted-foreground md:table-cell">
        {formatDate(campaign.startDate)}
      </td>
      <td className="hidden py-3.5 pr-4 text-muted-foreground lg:table-cell">
        {formatDate(campaign.endDate)}
      </td>
      <td className="py-3.5 pr-4 text-muted-foreground">{campaign.contentCount ?? 0}</td>
      <td className="py-3.5 pr-4">
        <div className="flex items-center gap-1.5">
          {(campaign.platforms ?? []).length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            campaign.platforms?.map((platform) => (
              <PlatformIcon key={platform} platform={platform} className="size-4" />
            ))
          )}
        </div>
      </td>
      <td className="hidden py-3.5 text-muted-foreground xl:table-cell">
        {performance
          ? formatMetric(performance.engagement ?? performance.reach ?? performance.impressions)
          : "—"}
      </td>
    </tr>
  );
}

export function CampaignCard({
  campaign,
  performance,
}: {
  campaign: CampaignRecord;
  performance?: CampaignRowProps["performance"];
}) {
  const objectiveLabel =
    campaign.objective != null
      ? CAMPAIGN_OBJECTIVE_LABELS[campaign.objective as CampaignObjective]
      : "—";

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="block rounded-lg border border-border/60 p-4 transition-colors hover:border-border"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{campaign.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{objectiveLabel}</p>
        </div>
        <CampaignStatusBadge status={campaign.status} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
        <div>
          <p className="text-muted-foreground/70">Content</p>
          <p className="mt-0.5 text-foreground">{campaign.contentCount ?? 0}</p>
        </div>
        <div>
          <p className="text-muted-foreground/70">Performance</p>
          <p className="mt-0.5 text-foreground">
            {performance
              ? formatMetric(
                  performance.engagement ?? performance.reach ?? performance.impressions
                )
              : "—"}
          </p>
        </div>
      </div>
    </Link>
  );
}
