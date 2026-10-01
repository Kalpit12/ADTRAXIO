"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { AskAdtraxioLink } from "@/components/assistant/ask-adtraxio-link";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status";
import { CampaignApprovalPanel } from "@/components/collaboration/campaign-approval-panel";
import { PublishStatusBadge } from "@/components/publishing/publish-status-badge";
import type { PublishingStatus } from "@/lib/publishing/types";
import { IntelligencePanel } from "@/components/intelligence/intelligence-panel";
import { Button } from "@/components/ui/button";
import {
  CAMPAIGN_OBJECTIVE_LABELS,
  type CAMPAIGN_OBJECTIVES,
} from "@/lib/campaigns/constants";
import type {
  CampaignDetail,
  CampaignPerformance,
  CampaignStatus,
} from "@/lib/campaigns/types";
import type { SafeSocialAccount } from "@/lib/social/types";
type CampaignObjective = (typeof CAMPAIGN_OBJECTIVES)[number];

type ContentOption = {
  id: string;
  headline: string | null;
  platform: string;
  status: string;
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function formatMetric(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString();
}

function formatRate(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}%`;
}

interface CampaignDetailViewProps {
  campaignId: string;
}

export function CampaignDetailView({ campaignId }: CampaignDetailViewProps) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [performance, setPerformance] = useState<CampaignPerformance | null>(null);
  const [availableContent, setAvailableContent] = useState<ContentOption[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<SafeSocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const loadCampaign = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [campaignRes, performanceRes] = await Promise.all([
        fetch(`/api/campaigns/${campaignId}`),
        fetch(`/api/campaigns/${campaignId}/performance`),
      ]);

      const campaignPayload = (await campaignRes.json()) as {
        campaign?: CampaignDetail;
        error?: string;
      };
      const performancePayload = (await performanceRes.json()) as {
        performance?: CampaignPerformance;
      };

      if (!campaignRes.ok) {
        setError(campaignPayload.error ?? "Unable to load campaign.");
        return;
      }

      setCampaign(campaignPayload.campaign ?? null);
      setPerformance(performancePayload.performance ?? null);

      if (campaignPayload.campaign) {
        setEditName(campaignPayload.campaign.name);
        setEditDescription(campaignPayload.campaign.description ?? "");
      }
    } catch {
      setError("Unable to load campaign.");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const loadAttachOptions = useCallback(async () => {
    const [contentRes, accountsRes] = await Promise.all([
      fetch("/api/content"),
      fetch("/api/social/accounts"),
    ]);

    const contentPayload = (await contentRes.json()) as { content?: ContentOption[] };
    const accountsPayload = (await accountsRes.json()) as {
      accounts?: SafeSocialAccount[];
    };

    setAvailableContent(contentPayload.content ?? []);
    setAvailableAccounts(
      (accountsPayload.accounts ?? []).filter(
        (account) =>
          account.status === "connected" &&
          (account.platform === "facebook" || account.platform === "instagram")
      )
    );
  }, []);

  useEffect(() => {
    void loadCampaign();
  }, [loadCampaign]);

  async function updateStatus(status: CampaignStatus) {
    setActionLoading(true);
    setActionError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setActionError(payload.error ?? "Unable to update campaign.");
        return;
      }

      await loadCampaign();
    } catch {
      setActionError("Unable to update campaign.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleArchive() {
    if (!confirm("Archive this campaign? It will be hidden from normal lists.")) {
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setActionError(payload.error ?? "Unable to archive campaign.");
        return;
      }

      router.push("/campaigns");
    } catch {
      setActionError("Unable to archive campaign.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveEdit() {
    setActionLoading(true);
    setActionError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDescription || null,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setActionError(payload.error ?? "Unable to save changes.");
        return;
      }

      setEditing(false);
      await loadCampaign();
    } catch {
      setActionError("Unable to save changes.");
    } finally {
      setActionLoading(false);
    }
  }

  async function attachContent(contentId: string) {
    setActionLoading(true);
    setActionError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setActionError(payload.error ?? "Unable to attach content.");
        return;
      }

      setShowAddContent(false);
      await loadCampaign();
    } catch {
      setActionError("Unable to attach content.");
    } finally {
      setActionLoading(false);
    }
  }

  async function detachContent(contentId: string) {
    setActionLoading(true);
    setActionError(null);

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/content/${contentId}`,
        { method: "DELETE" }
      );

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setActionError(payload.error ?? "Unable to detach content.");
        return;
      }

      await loadCampaign();
    } catch {
      setActionError("Unable to detach content.");
    } finally {
      setActionLoading(false);
    }
  }

  async function attachAccount(socialAccountId: string) {
    setActionLoading(true);
    setActionError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socialAccountId }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setActionError(payload.error ?? "Unable to attach account.");
        return;
      }

      setShowAddAccount(false);
      await loadCampaign();
    } catch {
      setActionError("Unable to attach account.");
    } finally {
      setActionLoading(false);
    }
  }

  async function detachAccount(socialAccountId: string) {
    setActionLoading(true);
    setActionError(null);

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/accounts/${socialAccountId}`,
        { method: "DELETE" }
      );

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setActionError(payload.error ?? "Unable to detach account.");
        return;
      }

      await loadCampaign();
    } catch {
      setActionError("Unable to detach account.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-10" aria-busy="true" aria-label="Loading campaign">
        <div className="space-y-4 border-b border-border/60 pb-6">
          <div className="h-3 w-24 animate-pulse rounded bg-secondary/40" />
          <div className="h-9 w-2/3 max-w-md animate-pulse rounded bg-secondary/40" />
          <div className="h-4 w-48 animate-pulse rounded bg-secondary/30" />
        </div>
        <div className="grid gap-px overflow-hidden rounded-md border border-border/60 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse bg-secondary/20" />
          ))}
        </div>
        <div className="h-40 animate-pulse rounded-md bg-secondary/20" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="space-y-4">
        <p role="alert" className="rounded-md border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200/90">
          {error ?? "Campaign not found."}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadCampaign()}>
          Try again
        </Button>
        <Button type="button" variant="ghost" size="sm" asChild>
          <Link href="/campaigns">Back to campaigns</Link>
        </Button>
      </div>
    );
  }

  const objectiveLabel =
    campaign.objective != null
      ? CAMPAIGN_OBJECTIVE_LABELS[campaign.objective as CampaignObjective]
      : "—";

  const attachedContentIds = new Set(campaign.content.map((item) => item.contentId));
  const attachableContent = availableContent.filter(
    (item) => !attachedContentIds.has(item.id)
  );

  const attachedAccountIds = new Set(
    campaign.accounts.map((item) => item.socialAccountId)
  );
  const attachableAccounts = availableAccounts.filter(
    (item) => !attachedAccountIds.has(item.id)
  );

  const contentPerformanceMap = new Map(
    (performance?.contentBreakdown ?? []).map((row) => [row.contentId, row])
  );

  return (
    <div className="space-y-10">
      <header className="border-b border-border/60 pb-6">
        <Link
          href="/campaigns"
          className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Campaigns
        </Link>

        {editing ? (
          <div className="mt-4 space-y-4">
            <input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              className="w-full max-w-xl rounded-md border border-border/60 bg-background px-3 py-2.5 text-2xl font-semibold text-foreground outline-none focus:border-adtraxio-accent/40"
            />
            <textarea
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              rows={2}
              placeholder="Description"
              className="w-full max-w-xl rounded-md border border-border/60 bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-adtraxio-accent/40"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit} disabled={actionLoading}>
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="font-heading text-3xl tracking-tight text-foreground sm:text-4xl">
                  {campaign.name}
                </h1>
                {campaign.description && (
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {campaign.description}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <CampaignStatusBadge status={campaign.status} />
                  <span>{objectiveLabel}</span>
                  <span>
                    {formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <AskAdtraxioLink
                  variant="button"
                  label="Analyze this campaign"
                  prompt={`Analyze campaign ${campaignId} using real campaign and performance data. Summarize what happened, why it matters, and recommended next steps.`}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(true)}
                  disabled={actionLoading || campaign.status === "archived"}
                >
                  Edit
                </Button>
                {campaign.status === "active" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus("paused")}
                    disabled={actionLoading}
                  >
                    Pause
                  </Button>
                ) : campaign.status === "paused" || campaign.status === "draft" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus("active")}
                    disabled={actionLoading}
                  >
                    Activate
                  </Button>
                ) : null}
                {campaign.status !== "completed" && campaign.status !== "archived" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus("completed")}
                    disabled={actionLoading}
                  >
                    Mark completed
                  </Button>
                ) : null}
                {campaign.status !== "archived" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleArchive}
                    disabled={actionLoading}
                  >
                    Archive
                  </Button>
                ) : null}
              </div>
            </div>
          </>
        )}
      </header>

      {actionError && (
        <p className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {actionError}
        </p>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Overview
            </p>
            <h2 className="font-heading text-lg tracking-tight text-foreground">
              Campaign snapshot
            </h2>
          </div>
          <Link
            href="/publishing"
            className="text-xs font-medium text-adtraxio-accent hover:underline"
          >
            Open publishing queue
          </Link>
        </div>
        <dl className="grid divide-y divide-border/50 rounded-md border border-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5">
          {[
            { label: "Content", value: String(campaign.contentCount ?? 0) },
            { label: "Accounts", value: String(campaign.accountCount ?? 0) },
            { label: "Published", value: String(campaign.publishing.published) },
            { label: "Scheduled", value: String(campaign.publishing.scheduled) },
            { label: "Failed", value: String(campaign.publishing.failed) },
          ].map((item) => (
            <div key={item.label} className="px-4 py-4">
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {item.label}
              </dt>
              <dd className="mt-1 font-heading text-2xl tabular-nums text-foreground">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-4 border-t border-border/60 pt-10">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Results
          </p>
          <h2 className="font-heading text-lg tracking-tight text-foreground">
            Performance
          </h2>
        </div>
        {performance?.hasData ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Impressions", value: performance.summary.impressions },
                { label: "Reach", value: performance.summary.reach },
                { label: "Engagement", value: performance.summary.engagement },
                {
                  label: "Engagement rate",
                  value: performance.summary.engagementRate,
                  rate: true,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border/60 px-4 py-4"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                    {item.rate
                      ? formatRate(item.value as number | null)
                      : formatMetric(item.value as number | null)}
                  </p>
                </div>
              ))}
            </div>

            {performance.platformBreakdown.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-xs text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">Platform</th>
                      <th className="pb-3 pr-4 font-medium">Impressions</th>
                      <th className="pb-3 pr-4 font-medium">Reach</th>
                      <th className="pb-3 font-medium">Engagement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performance.platformBreakdown.map((row) => (
                      <tr key={row.platform} className="border-b border-border/50">
                        <td className="py-3 pr-4 capitalize text-foreground">
                          {row.platform}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {formatMetric(row.impressions)}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {formatMetric(row.reach)}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {formatMetric(row.engagement)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Performance data will appear once campaign content is published and
            analytics are available.
          </p>
        )}
      </section>

      <section className="border-t border-border/60 pt-10">
        <IntelligencePanel
          title="Campaign intelligence"
          campaignId={campaignId}
          compact
          maxItems={2}
          viewAllHref="/intelligence"
        />
      </section>

      <section className="space-y-4 border-t border-border/60 pt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Publishing
            </p>
            <h2 className="font-heading text-lg tracking-tight text-foreground">
              Campaign content
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              What you are publishing for this initiative. Schedule from Content Studio or the publishing queue.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void loadAttachOptions();
              setShowAddContent((prev) => !prev);
            }}
            disabled={actionLoading || campaign.status === "archived"}
          >
            Add content
          </Button>
        </div>

        {showAddContent && (
          <div className="rounded-lg border border-border/60 p-4">
            {attachableContent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No saved content available.{" "}
                <Link href="/create" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Create content
                </Link>
              </p>
            ) : (
              <div className="space-y-2">
                {attachableContent.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => attachContent(item.id)}
                    disabled={actionLoading}
                    className="flex w-full items-center justify-between rounded-md border border-border/60 px-3 py-2.5 text-left text-sm transition-colors hover:border-border"
                  >
                    <span className="text-foreground">
                      {item.headline ?? "Untitled"}
                    </span>
                    <span className="text-xs capitalize text-muted-foreground">
                      {item.platform}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {campaign.content.length === 0 ? (
          <div className="rounded-lg border border-border/60 px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              This campaign has no content yet.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link href="/create">Create content</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Content</th>
                  <th className="pb-3 pr-4 font-medium">Platform</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Published</th>
                  <th className="pb-3 pr-4 font-medium">Engagement</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {campaign.content.map((item) => {
                  const perf = contentPerformanceMap.get(item.contentId);
                  return (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="py-3 pr-4 font-medium text-foreground">
                        {item.headline ?? "Untitled"}
                      </td>
                      <td className="py-3 pr-4 capitalize text-muted-foreground">
                        {item.platform ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        {item.publishingStatus ? (
                          <PublishStatusBadge
                            status={item.publishingStatus as PublishingStatus}
                          />
                        ) : (
                          <span className="text-xs capitalize text-muted-foreground">
                            {item.status ?? "—"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatDateTime(item.publishedAt)}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatMetric(perf?.engagement)}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => detachContent(item.contentId)}
                          disabled={actionLoading}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4 border-t border-border/60 pt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Channels
            </p>
            <h2 className="font-heading text-lg tracking-tight text-foreground">
              Accounts & platforms
            </h2>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void loadAttachOptions();
              setShowAddAccount((prev) => !prev);
            }}
            disabled={actionLoading || campaign.status === "archived"}
          >
            Add account
          </Button>
        </div>

        {showAddAccount && (
          <div className="rounded-lg border border-border/60 p-4">
            {attachableAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Connect a social account to target publishing channels.{" "}
                <Link href="/social" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Manage connections
                </Link>
              </p>
            ) : (
              <div className="space-y-2">
                {attachableAccounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => attachAccount(account.id)}
                    disabled={actionLoading}
                    className="flex w-full items-center gap-3 rounded-md border border-border/60 px-3 py-2.5 text-left text-sm transition-colors hover:border-border"
                  >
                    <PlatformIcon platform={account.platform} className="size-4" />
                    <span className="flex-1 text-foreground">
                      {account.accountName ?? account.username ?? account.platform}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {campaign.accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Connect a social account to target publishing channels.{" "}
            <Link href="/social" className="font-medium text-foreground underline-offset-4 hover:underline">
              Manage connections
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {campaign.accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-md border border-border/60 px-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={account.platform} className="size-4" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {account.accountName ?? account.username ?? account.platform}
                    </p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {account.platform}
                    </p>
                  </div>
                </div>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => detachAccount(account.socialAccountId)}
                  disabled={actionLoading || campaign.status === "archived"}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <CampaignApprovalPanel campaignId={campaignId} />
    </div>
  );
}
