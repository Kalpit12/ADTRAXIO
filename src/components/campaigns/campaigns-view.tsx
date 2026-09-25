"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Megaphone, Plus } from "lucide-react";
import {
  CampaignCard,
  CampaignRow,
} from "@/components/campaigns/campaign-row";
import {
  CampaignFilters,
  type CampaignSort,
  type CampaignStatusFilter,
} from "@/components/campaigns/campaign-filters";
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
    <div className="space-y-10">
      <header className="border-b border-border/60 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Campaigns</p>
            <h1 className="font-heading mt-1 text-3xl tracking-tight text-foreground sm:text-4xl">
              Organic social campaigns
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Group content, publishing channels, and performance into focused
              campaigns.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/campaigns/new">
              <Plus className="size-3.5" />
              Create campaign
            </Link>
          </Button>
        </div>
      </header>

      <CampaignFilters
        status={status}
        sort={sort}
        onStatusChange={setStatus}
        onSortChange={setSort}
      />

      {error && (
        <p className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded-lg bg-secondary/30" />
          <div className="h-16 animate-pulse rounded-lg bg-secondary/30" />
          <div className="h-16 animate-pulse rounded-lg bg-secondary/30" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-lg border border-border/60 px-6 py-12 text-center">
          <Megaphone className="mx-auto size-5 text-muted-foreground" strokeWidth={1.5} />
          <p className="mt-4 text-base font-semibold text-foreground">
            Create your first campaign
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Create your first campaign to organize content and measure its
            performance.
          </p>
          <Button asChild size="sm" className="mt-5">
            <Link href="/campaigns/new">Create campaign</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Campaign</th>
                  <th className="pb-3 pr-4 font-medium">Objective</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="hidden pb-3 pr-4 font-medium md:table-cell">Start</th>
                  <th className="hidden pb-3 pr-4 font-medium lg:table-cell">End</th>
                  <th className="pb-3 pr-4 font-medium">Content</th>
                  <th className="pb-3 pr-4 font-medium">Platforms</th>
                  <th className="hidden pb-3 font-medium xl:table-cell">Engagement</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <CampaignRow key={campaign.id} campaign={campaign} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
