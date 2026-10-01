"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PublishPanel } from "@/components/publishing/publish-panel";
import { Button } from "@/components/ui/button";
import type { CampaignRecord } from "@/lib/campaigns/types";
import {
  resolvePublishableMediaAssetId,
  selectDefaultPublishableSlot,
} from "@/lib/content/creative-campaign";
import type { CreativeStudioSnapshot } from "@/lib/content/creative-studio-types";
import type { CreativeBrief } from "@/lib/content/types";
import type { StudioVisualAssetRef } from "@/lib/content/visual-types";
import type { PublishingMediaType } from "@/lib/publishing/types";

interface PrepareResult {
  contentId: string;
  campaignId: string;
  creativeStatus: string;
  approvalStatus: string | null;
  publishBlocked: boolean;
  publishBlockReason: string | null;
  media: {
    assetId: string;
    sourceAssetId: string;
    mediaType: PublishingMediaType;
    publishReady: boolean;
  } | null;
  mediaLimitation: string | null;
  supplementary: {
    voiceAssetIds: string[];
    soundAssetIds: string[];
  };
}

interface CreativeCampaignPanelProps {
  brief: CreativeBrief;
  studio: CreativeStudioSnapshot;
  visualAssets: StudioVisualAssetRef[];
  caption: string;
}

export function CreativeCampaignPanel({
  brief,
  studio,
  visualAssets,
  caption,
}: CreativeCampaignPanelProps) {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [campaignId, setCampaignId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [prepareResult, setPrepareResult] = useState<PrepareResult | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const publishableSlots = useMemo(
    () =>
      studio.assetSlots.filter(
        (s) =>
          s.status === "ready" &&
          s.assetId &&
          (s.kind === "image" || s.kind === "video")
      ),
    [studio.assetSlots]
  );

  useEffect(() => {
    setLoadingCampaigns(true);
    fetch("/api/campaigns?status=active")
      .then((res) => res.json())
      .then((data: { campaigns?: CampaignRecord[]; error?: string }) => {
        if (data.error) {
          setPrepareError(data.error);
          return;
        }
        setCampaigns(data.campaigns ?? []);
        if (data.campaigns?.[0]) {
          setCampaignId(data.campaigns[0].id);
        }
      })
      .catch(() => setPrepareError("Unable to load campaigns."))
      .finally(() => setLoadingCampaigns(false));
  }, []);

  useEffect(() => {
    const defaultId = resolvePublishableMediaAssetId(studio.assetSlots, null);
    setSelectedAssetId(defaultId);
  }, [studio.assetSlots]);

  async function handlePrepare() {
    if (!campaignId) {
      setPrepareError("Select a campaign.");
      return;
    }
    setPreparing(true);
    setPrepareError(null);
    setStatusMessage(null);
    try {
      const response = await fetch("/api/creative/campaign-prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          brief,
          studio,
          visualAssets,
          selectedMediaAssetId: selectedAssetId,
        }),
      });
      const payload = (await response.json()) as PrepareResult & { error?: string };
      if (!response.ok) {
        setPrepareError(payload.error ?? "Unable to prepare creative for campaign.");
        return;
      }
      setPrepareResult(payload);
      setStatusMessage("Creative linked to campaign as content.");
    } catch {
      setPrepareError("Unable to reach the campaign service.");
    } finally {
      setPreparing(false);
    }
  }

  const defaultSlot = selectDefaultPublishableSlot(studio.assetSlots);

  return (
    <section
      className="space-y-4 rounded-md border border-border/70 p-4"
      aria-labelledby="creative-campaign-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id="creative-campaign-title"
          className="text-sm font-medium text-foreground"
        >
          Add to campaign
        </h3>
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href="/campaigns/new">Create campaign</Link>
        </Button>
      </div>

      {prepareError && (
        <p className="text-sm text-destructive" role="alert">{prepareError}</p>
      )}
      {statusMessage && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {statusMessage}
        </p>
      )}

      <label className="block text-xs text-muted-foreground">
        Campaign
        <select
          className="mt-1 w-full rounded border border-border bg-background px-2 py-2 text-sm"
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          disabled={loadingCampaigns}
          aria-label="Select campaign"
        >
          <option value="">Select campaign</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      {publishableSlots.length > 0 && (
        <label className="block text-xs text-muted-foreground">
          Publishing media
          <select
            className="mt-1 w-full rounded border border-border bg-background px-2 py-2 text-sm"
            value={selectedAssetId ?? ""}
            onChange={(e) => setSelectedAssetId(e.target.value || null)}
            aria-label="Select media asset for publishing"
          >
            {publishableSlots.map((slot) => (
              <option key={slot.id} value={slot.assetId}>
                {slot.label} ({slot.kind})
              </option>
            ))}
          </select>
        </label>
      )}

      {!defaultSlot && (
        <p className="text-xs text-muted-foreground" role="status">
          Generate a ready image or video asset to publish to social.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={preparing || !campaignId}
          onClick={() => void handlePrepare()}
        >
          {preparing ? "Preparing…" : "Prepare for publishing"}
        </Button>
        {prepareResult && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPublishOpen(true)}
            >
              Schedule / publish
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href={`/campaigns/${prepareResult.campaignId}`}>
                View campaign
              </Link>
            </Button>
          </>
        )}
      </div>

      {prepareResult && (
        <div
          className="rounded border border-border/60 bg-adtraxio-surface/10 p-3 text-xs text-muted-foreground"
          aria-label="Publishing review"
        >
          <p className="font-medium text-foreground">Review</p>
          <ul className="mt-2 space-y-1">
            <li>Platform: {brief.platform}</li>
            <li>Campaign: {prepareResult.campaignId}</li>
            <li>Content: {prepareResult.contentId}</li>
            <li>Status: {prepareResult.creativeStatus.replace("_", " ")}</li>
            <li>
              Approval: {prepareResult.approvalStatus ?? "none required yet"}
            </li>
            <li>
              Media:{" "}
              {prepareResult.media
                ? `${prepareResult.media.mediaType} (asset ${prepareResult.media.assetId})`
                : prepareResult.mediaLimitation ?? "not ready"}
            </li>
            {prepareResult.supplementary.voiceAssetIds.length > 0 && (
              <li>
                Voice metadata: {prepareResult.supplementary.voiceAssetIds.join(", ")}
              </li>
            )}
          </ul>
        </div>
      )}

      <PublishPanel
        open={publishOpen}
        contentId={prepareResult?.contentId}
        caption={caption}
        initialMediaAssetId={
          prepareResult?.media?.publishReady
            ? prepareResult.media.assetId
            : null
        }
        initialMediaType={prepareResult?.media?.mediaType ?? null}
        lockMedia={Boolean(prepareResult?.media?.publishReady)}
        publishBlocked={prepareResult?.publishBlocked ?? false}
        publishBlockedReason={prepareResult?.publishBlockReason}
        onClose={() => setPublishOpen(false)}
        onSuccess={(msg) => {
          setStatusMessage(msg);
          setPublishOpen(false);
        }}
      />
    </section>
  );
}
