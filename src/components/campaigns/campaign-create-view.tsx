"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { CampaignFormSection } from "@/components/campaigns/campaign-form-section";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  CAMPAIGN_OBJECTIVE_LABELS,
  CAMPAIGN_OBJECTIVES,
} from "@/lib/campaigns/constants";
import type { CampaignObjective } from "@/lib/campaigns/types";
import type { SafeSocialAccount } from "@/lib/social/types";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-md border border-border/70 bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-adtraxio-accent/40 focus:ring-2 focus:ring-adtraxio-accent/15";

export function CampaignCreateView() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState<CampaignObjective>("awareness");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [accounts, setAccounts] = useState<SafeSocialAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/social/accounts")
      .then((res) => res.json())
      .then((data: { accounts?: SafeSocialAccount[] }) => {
        const connected = (data.accounts ?? []).filter(
          (account) =>
            account.status === "connected" &&
            (account.platform === "facebook" || account.platform === "instagram")
        );
        setAccounts(connected);
      })
      .catch(() => {
        setAccounts([]);
      });
  }, []);

  function toggleAccount(accountId: string) {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          objective,
          startDate: startDate || null,
          endDate: endDate || null,
          status: "draft",
          socialAccountIds: selectedAccountIds,
        }),
      });

      const payload = (await response.json()) as {
        campaign?: { id: string };
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Unable to create campaign.");
        return;
      }

      if (payload.campaign?.id) {
        router.push(`/campaigns/${payload.campaign.id}`);
      } else {
        router.push("/campaigns");
      }
    } catch {
      setError("Unable to create campaign.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="New campaign"
        description="Set an objective and channels. You'll attach content and manage publishing separately."
      />

      <form onSubmit={handleSubmit} className="space-y-2">
        <CampaignFormSection
          title="Identity"
          description="Name and context for your team"
        >
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-foreground">
              Campaign name
            </label>
            <input
              id="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Q4 Product Launch"
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="description"
              className="text-sm font-medium text-foreground"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Optional context for your team"
              className={inputClass}
            />
          </div>
        </CampaignFormSection>

        <CampaignFormSection title="Objective">
          <div className="flex flex-wrap gap-1.5">
            {CAMPAIGN_OBJECTIVES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setObjective(value)}
                className={cn(
                  "min-h-9 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  objective === value
                    ? "border-adtraxio-accent/35 bg-white/[0.05] ring-1 ring-adtraxio-accent/15"
                    : "border-border/70 text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={objective === value}
              >
                {CAMPAIGN_OBJECTIVE_LABELS[value]}
              </button>
            ))}
          </div>
        </CampaignFormSection>

        <CampaignFormSection title="Timing" description="Optional campaign period">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="startDate" className="text-sm font-medium text-foreground">
                Start date
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="endDate" className="text-sm font-medium text-foreground">
                End date
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </CampaignFormSection>

        <CampaignFormSection
          title="Platforms & accounts"
          description="Where this campaign will publish"
        >
          {accounts.length === 0 ? (
            <div className="rounded-md border border-border/60 px-4 py-4 text-sm text-muted-foreground">
              Connect a social account first.{" "}
              <Link
                href="/social"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Manage connections
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => {
                const selected = selectedAccountIds.includes(account.id);
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => toggleAccount(account.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left text-sm transition-colors",
                      selected
                        ? "border-adtraxio-accent/35 bg-white/[0.04]"
                        : "border-border/60 hover:border-border"
                    )}
                    aria-pressed={selected}
                  >
                    <PlatformIcon platform={account.platform} className="size-4" />
                    <span className="flex-1 text-foreground">
                      {account.accountName ?? account.username ?? account.platform}
                    </span>
                    <span className="text-xs capitalize text-muted-foreground">
                      {account.platform}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </CampaignFormSection>

        {error && (
          <p role="alert" className="text-sm text-red-200/90">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3 border-t border-border/60 pt-6">
          <Button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? "Creating…" : "Create campaign"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/campaigns">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
