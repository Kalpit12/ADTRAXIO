"use client";

import { ContentPreview } from "@/components/content/content-preview";
import { StudioInput, StudioTextarea } from "@/components/content/studio-field";
import { fetchSignedAssetUrl } from "@/lib/content/visual-client";
import type { ContentPlatform, ContentType, GeneratedCreative } from "@/lib/content/types";
import type { CreativeAssetSlot } from "@/lib/content/creative-studio-types";
import { contentPreviewMediaType, type StudioVisualAssetRef } from "@/lib/content/visual-types";
import { useEffect, useMemo, useState } from "react";

interface CreativeCanvasProps {
  platform: ContentPlatform;
  contentType: ContentType;
  creative: GeneratedCreative;
  canvasHeadline: string;
  canvasCaption: string;
  canvasCta: string;
  slots: CreativeAssetSlot[];
  visualAssets: StudioVisualAssetRef[];
  onCanvasChange: (patch: {
    headline?: string;
    caption?: string;
    cta?: string;
  }) => void;
}

export function CreativeCanvas({
  platform,
  contentType,
  creative,
  canvasHeadline,
  canvasCaption,
  canvasCta,
  slots,
  visualAssets,
  onCanvasChange,
}: CreativeCanvasProps) {
  const primaryImage = slots.find((s) => s.kind === "image" && s.status === "ready");
  const primaryVideo = slots.find((s) => s.kind === "video" && s.status === "ready");
  const primaryVisual = primaryVideo ?? primaryImage;
  const [visualUrl, setVisualUrl] = useState<string | null>(null);

  const visualAsset = useMemo(
    () =>
      primaryVisual?.assetId
        ? visualAssets.find((a) => a.assetId === primaryVisual.assetId) ?? null
        : null,
    [primaryVisual, visualAssets]
  );

  useEffect(() => {
    if (primaryVisual?.assetId) {
      void fetchSignedAssetUrl(primaryVisual.assetId).then(setVisualUrl);
    } else {
      setVisualUrl(null);
    }
  }, [primaryVisual?.assetId]);

  const previewCreative: GeneratedCreative = {
    ...creative,
    headline: canvasHeadline || creative.headline,
    caption: canvasCaption || creative.caption,
    cta: canvasCta || creative.cta,
  };

  const visualType =
    primaryVideo
      ? "video"
      : primaryImage
        ? "image"
        : contentPreviewMediaType(visualAsset) ?? "image";

  const voiceSlot = slots.find((s) => s.kind === "voice" && s.status === "ready");
  const soundSlot = slots.find((s) => s.kind === "sound" && s.status === "ready");
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [soundUrl, setSoundUrl] = useState<string | null>(null);

  useEffect(() => {
    if (voiceSlot?.assetId) {
      void fetchSignedAssetUrl(voiceSlot.assetId).then(setVoiceUrl);
    } else setVoiceUrl(null);
  }, [voiceSlot?.assetId]);

  useEffect(() => {
    if (soundSlot?.assetId) {
      void fetchSignedAssetUrl(soundSlot.assetId).then(setSoundUrl);
    } else setSoundUrl(null);
  }, [soundSlot?.assetId]);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Composition
        </p>
        <StudioInput
          label="Headline on canvas"
          value={canvasHeadline}
          onChange={(e) => onCanvasChange({ headline: e.target.value })}
        />
        <StudioTextarea
          label="Caption"
          value={canvasCaption}
          onChange={(e) => onCanvasChange({ caption: e.target.value })}
          rows={3}
        />
        <StudioInput
          label="CTA"
          value={canvasCta}
          onChange={(e) => onCanvasChange({ cta: e.target.value })}
        />
        {voiceUrl && (
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Voiceover</p>
            <audio src={voiceUrl} controls preload="metadata" className="w-full" />
          </div>
        )}
        {soundUrl && (
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Sound</p>
            <audio src={soundUrl} controls preload="metadata" className="w-full" />
          </div>
        )}
      </div>
      <div>
        <p className="mb-2 text-xs text-muted-foreground">
          Platform preview — structural representation, not the live published UI.
        </p>
        <ContentPreview
          creative={previewCreative}
          platform={platform}
          contentType={contentType}
          visualUrl={visualUrl}
          visualType={visualType}
        />
      </div>
    </div>
  );
}
