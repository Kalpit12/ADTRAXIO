"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fetchSignedAssetUrl } from "@/lib/content/visual-client";
import type { CreativeAssetSlot } from "@/lib/content/creative-studio-types";
import { useEffect, useState } from "react";

interface AssetSlotCardProps {
  slot: CreativeAssetSlot;
  disabled?: boolean;
  onGenerate: () => void;
  onRegenerate: () => void;
  onRemove: () => void;
}

export function AssetSlotCard({
  slot,
  disabled,
  onGenerate,
  onRegenerate,
  onRemove,
}: AssetSlotCardProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (slot.status === "ready" && slot.assetId) {
      void fetchSignedAssetUrl(slot.assetId).then(setPreviewUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [slot.assetId, slot.status]);

  const statusLabel =
    slot.status === "not_created"
      ? "Not created"
      : slot.status === "generating" || slot.status === "processing"
        ? "Generating"
        : slot.status === "ready"
          ? "Ready"
          : "Failed";

  return (
    <article
      className="rounded-md border border-border/70 bg-adtraxio-surface/10 p-4"
      aria-labelledby={`slot-${slot.id}-title`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3
            id={`slot-${slot.id}-title`}
            className="text-sm font-medium text-foreground"
          >
            {slot.label}
          </h3>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Status: {statusLabel}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>

      {slot.errorMessage && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {slot.errorMessage}
        </p>
      )}

      {previewUrl && slot.kind === "image" && (
        <img
          src={previewUrl}
          alt=""
          className="mt-3 max-h-40 w-full rounded border border-border/50 object-contain"
          onError={() => slot.assetId && void fetchSignedAssetUrl(slot.assetId).then(setPreviewUrl)}
        />
      )}
      {previewUrl && slot.kind === "video" && (
        <video
          src={previewUrl}
          controls
          playsInline
          preload="metadata"
          className="mt-3 max-h-40 w-full rounded border border-border/50 bg-black"
        />
      )}
      {previewUrl && (slot.kind === "voice" || slot.kind === "sound") && (
        <audio
          src={previewUrl}
          controls
          preload="metadata"
          className="mt-3 w-full"
        />
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {slot.status === "not_created" || slot.status === "failed" ? (
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={onGenerate}
          >
            Generate
          </Button>
        ) : null}
        {slot.status === "ready" && slot.assetId && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            asChild
          >
            <Link
              href={`/create/editor/${slot.assetId}?return=${encodeURIComponent("/create/creative")}&slotId=${encodeURIComponent(slot.id)}`}
            >
              Edit asset
            </Link>
          </Button>
        )}
        {slot.status === "ready" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={onRegenerate}
          >
            Regenerate
          </Button>
        )}
        {slot.status === "failed" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={onGenerate}
          >
            Try again
          </Button>
        )}
      </div>
    </article>
  );
}
