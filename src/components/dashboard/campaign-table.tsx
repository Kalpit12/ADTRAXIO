"use client";

import Link from "next/link";
import { Megaphone } from "lucide-react";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status";
import { Button } from "@/components/ui/button";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-panel";
import {
  CAMPAIGN_OBJECTIVE_LABELS,
  type CAMPAIGN_OBJECTIVES,
} from "@/lib/campaigns/constants";
import type { DashboardCampaign } from "@/lib/dashboard/types";

type CampaignObjective = (typeof CAMPAIGN_OBJECTIVES)[number];

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

interface CampaignTableProps {
  campaigns: DashboardCampaign[];
  activeCampaignCount: number;
}

export function CampaignTable({
  campaigns,
  activeCampaignCount,
}: CampaignTableProps) {
  return (
    <section>
      <DashboardSectionHeader
        title="Campaigns"
        action={
          <Link
            href="/campaigns"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View campaigns
          </Link>
        }
      />

      <div className="mt-4 rounded-lg border border-border/60 px-4 py-4">
        <p className="text-xs font-medium text-muted-foreground">Active campaigns</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          {activeCampaignCount}
        </p>
        {activeCampaignCount === 0 && (
          <p className="mt-1 text-sm text-muted-foreground">No active campaigns</p>
        )}
      </div>

      {campaigns.length === 0 ? (
        <div className="mt-6 py-8">
          <Megaphone
            className="size-5 text-muted-foreground"
            strokeWidth={1.5}
          />
          <p className="mt-4 text-base font-semibold text-foreground">
            No campaigns yet
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Create your first campaign to organize content and measure its
            performance.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-5">
            <Link href="/campaigns/new">Create campaign</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/70 text-xs text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Campaign</th>
                <th className="pb-3 pr-4 font-medium">Objective</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">Content</th>
                <th className="pb-3 font-medium">Dates</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => {
                const objectiveLabel =
                  campaign.objective != null
                    ? CAMPAIGN_OBJECTIVE_LABELS[
                        campaign.objective as CampaignObjective
                      ]
                    : "—";

                return (
                  <tr
                    key={campaign.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-3.5 pr-4">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="font-medium text-foreground transition-colors hover:text-adtraxio-accent"
                      >
                        {campaign.name}
                      </Link>
                    </td>
                    <td className="py-3.5 pr-4 text-muted-foreground">
                      {objectiveLabel}
                    </td>
                    <td className="py-3.5 pr-4">
                      <CampaignStatusBadge status={campaign.status} />
                    </td>
                    <td className="py-3.5 pr-4 text-muted-foreground">
                      {campaign.contentCount}
                    </td>
                    <td className="py-3.5 text-muted-foreground">
                      {formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
