"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { Button } from "@/components/ui/button";
import {
  CAMPAIGN_OBJECTIVE_LABELS,
  CAMPAIGN_OBJECTIVES,
} from "@/lib/campaigns/constants";
import type { CampaignObjective } from "@/lib/campaigns/types";
import type { SafeSocialAccount } from "@/lib/social/types";
import { cn } from "@/lib/utils";

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
    <div className="mx-auto max-w-2xl space-y-10">
      <header className="border-b border-border/60 pb-6">
        <p className="text-xs font-medium text-muted-foreground">Campaigns</p>
        <h1 className="font-heading mt-1 text-3xl tracking-tight text-foreground sm:text-4xl">
          New campaign
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Set up an organic social campaign to organize content and track
          performance.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
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
            className="w-full rounded-md border border-border/60 bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-adtraxio-accent/40"
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
            className="w-full rounded-md border border-border/60 bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-adtraxio-accent/40"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="objective" className="text-sm font-medium text-foreground">
            Objective
          </label>
          <select
            id="objective"
            value={objective}
            onChange={(event) =>
              setObjective(event.target.value as CampaignObjective)
            }
            className="w-full rounded-md border border-border/60 bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-adtraxio-accent/40"
          >
            {CAMPAIGN_OBJECTIVES.map((value) => (
              <option key={value} value={value}>
                {CAMPAIGN_OBJECTIVE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

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
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-adtraxio-accent/40"
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
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-adtraxio-accent/40"
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Target platforms / accounts</p>
          {accounts.length === 0 ? (
            <div className="rounded-md border border-border/60 px-4 py-4 text-sm text-muted-foreground">
              Connect a social account to target publishing channels.{" "}
              <Link href="/social" className="font-medium text-foreground underline-offset-4 hover:underline">
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
                        ? "border-adtraxio-accent/40 bg-adtraxio-accent/5"
                        : "border-border/60 hover:border-border"
                    )}
                  >
                    <PlatformIcon platform={account.platform} className="size-4" />
                    <span className="flex-1 text-foreground">
                      {account.accountName ?? account.username ?? account.platform}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {account.platform}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
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
