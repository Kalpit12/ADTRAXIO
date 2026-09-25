"use client";

import { useEffect, useState } from "react";
import type { CampaignRecord } from "@/lib/campaigns/types";

interface CampaignSelectProps {
  value: string | null;
  onChange: (campaignId: string | null) => void;
  disabled?: boolean;
}

export function CampaignSelect({ value, onChange, disabled }: CampaignSelectProps) {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/campaigns?sort=name")
      .then((res) => res.json())
      .then((data: { campaigns?: CampaignRecord[] }) => {
        setCampaigns(
          (data.campaigns ?? []).filter((campaign) => campaign.status !== "archived")
        );
      })
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-2">
      <label htmlFor="campaign-select" className="text-xs font-medium text-muted-foreground">
        Campaign
      </label>
      <select
        id="campaign-select"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        disabled={disabled || loading}
        className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-adtraxio-accent/40 disabled:opacity-50"
      >
        <option value="">No campaign</option>
        {campaigns.map((campaign) => (
          <option key={campaign.id} value={campaign.id}>
            {campaign.name}
          </option>
        ))}
      </select>
    </div>
  );
}
