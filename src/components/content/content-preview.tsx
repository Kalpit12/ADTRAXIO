import { PlatformIcon } from "@/components/dashboard/platform-icon";
import {
  CONTENT_PLATFORM_LABELS,
  CONTENT_TYPE_LABELS,
} from "@/lib/content/constants";
import type { ContentPlatform, ContentType, GeneratedCreative } from "@/lib/content/types";
import { cn } from "@/lib/utils";

interface ContentPreviewProps {
  creative: GeneratedCreative;
  platform: ContentPlatform;
  contentType: ContentType;
  visualUrl?: string | null;
  visualType?: "image" | "video" | "audio";
  className?: string;
}

/** Text-only platform preview — no fabricated media or screenshots. */
export function ContentPreview({
  creative,
  platform,
  contentType,
  visualUrl,
  visualType = "image",
  className,
}: ContentPreviewProps) {
  const hashtags = creative.hashtags
    .map((t) => `#${t.replace(/^#/, "")}`)
    .join(" ");

  const showPlatformIcon =
    platform === "instagram" || platform === "facebook";

  return (
    <div
      className={cn(
        "rounded-md border border-border/70 bg-adtraxio-surface/20",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {showPlatformIcon && (
            <PlatformIcon platform={platform} size="sm" />
          )}
          <span>{CONTENT_PLATFORM_LABELS[platform]}</span>
          <span aria-hidden>·</span>
          <span>{CONTENT_TYPE_LABELS[contentType]}</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
          Preview
        </span>
      </div>

      <div className="space-y-4 px-4 py-5 sm:px-5">
        {visualUrl && visualType === "audio" && (
          <div className="rounded-md border border-border/50 bg-muted/20 p-3">
            <audio
              src={visualUrl}
              controls
              preload="metadata"
              className="w-full"
              aria-label="Attached audio preview"
            />
          </div>
        )}
        {visualUrl && visualType === "video" && (
          <div className="overflow-hidden rounded-md border border-border/50 bg-muted/20">
            <video
              src={visualUrl}
              controls
              playsInline
              preload="metadata"
              className="max-h-80 w-full bg-black object-contain"
              aria-label="Attached video preview"
            />
          </div>
        )}
        {visualUrl && visualType === "image" && (
          <div className="overflow-hidden rounded-md border border-border/50 bg-muted/20">
            <img
              src={visualUrl}
              alt=""
              className="max-h-80 w-full object-cover"
            />
          </div>
        )}
        {creative.hook && (
          <p className="font-heading text-lg leading-snug tracking-tight text-foreground sm:text-xl">
            {creative.hook}
          </p>
        )}
        {creative.headline && (
          <p className="text-base font-medium text-foreground/95">
            {creative.headline}
          </p>
        )}
        {creative.primaryCopy && (
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {creative.primaryCopy}
          </p>
        )}
        {creative.cta && (
          <p className="inline-flex rounded border border-adtraxio-accent/30 px-3 py-1.5 text-xs font-medium text-foreground">
            {creative.cta}
          </p>
        )}
        {(creative.caption || hashtags) && (
          <div className="border-t border-border/40 pt-4 text-sm leading-relaxed text-muted-foreground">
            {creative.caption && (
              <p className="whitespace-pre-wrap">{creative.caption}</p>
            )}
            {hashtags && <p className="mt-2 text-xs">{hashtags}</p>}
          </div>
        )}
        {creative.creativeDirection && (
          <p className="border-t border-border/40 pt-3 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground/70">Direction: </span>
            {creative.creativeDirection}
          </p>
        )}
      </div>
    </div>
  );
}
