"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  CampaignCard,
  CampaignRow,
} from "@/components/campaigns/campaign-row";
import { CampaignListSkeleton } from "@/components/campaigns/campaign-list-skeleton";
import {
  CampaignFilters,
  type CampaignSort,
  type CampaignStatusFilter,
} from "@/components/campaigns/campaign-filters";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import type { CampaignRecord } from "@/lib/campaigns/types";

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [status, setStatus] = useState<CampaignStatusFilter>("all");
  const [sort, setSort] = useState<CampaignSort>("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    params.set("sort", sort);

    try {
      const response = await fetch(`/api/campaigns?${params.toString()}`);
      const payload = (await response.json()) as {
        campaigns?: CampaignRecord[];
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Unable to load campaigns.");
        return;
      }

      setCampaigns(payload.campaigns ?? []);
    } catch {
      setError("Unable to load campaigns.");
    } finally {
      setLoading(false);
    }
  }, [sort, status]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Campaigns"
        description="Plan and manage growth initiatives — what you're trying to accomplish, with the content and channels that support it."
      >
        <Button asChild size="sm">
          <Link href="/campaigns/new">
            <Plus className="size-3.5" />
            New campaign
          </Link>
        </Button>
      </PageHeader>

      <p className="text-xs text-muted-foreground">
        Scheduling and delivery live in{" "}
        <Link href="/publishing" className="font-medium text-foreground hover:underline">
          Publishing
        </Link>
        .
      </p>

      <CampaignFilters
        status={status}
        sort={sort}
        onStatusChange={setStatus}
        onSortChange={setSort}
      />

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-500/25 bg-red-500/5 px-4 py-3"
        >
          <p className="text-sm text-red-200/90">{error}</p>
          <button
            type="button"
            onClick={() => void loadCampaigns()}
            className="mt-2 text-xs font-medium text-foreground underline-offset-2 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <CampaignListSkeleton />
      ) : campaigns.length === 0 ? (
        <div className="rounded-md border border-border/60 bg-adtraxio-surface/10 px-6 py-12 text-center sm:px-10">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Campaigns
          </p>
          <p className="mt-3 font-heading text-xl tracking-tight text-foreground">
            Create your first campaign
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Campaigns group content, channels, and outcomes around a clear
            objective. They stay separate from the publishing queue — strategy
            here, execution in Publishing.
          </p>
          <Button asChild size="sm" className="mt-6">
            <Link href="/campaigns/new">New campaign</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  <th scope="col" className="pb-3 pr-4 font-medium">Campaign</th>
                  <th scope="col" className="pb-3 pr-4 font-medium">Objective</th>
                  <th scope="col" className="pb-3 pr-4 font-medium">Status</th>
                  <th scope="col" className="hidden pb-3 pr-4 font-medium md:table-cell">
                    Period
                  </th>
                  <th scope="col" className="pb-3 pr-4 font-medium">Content</th>
                  <th scope="col" className="pb-3 font-medium">Platforms</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <CampaignRow key={campaign.id} campaign={campaign} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border/50 md:hidden">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
