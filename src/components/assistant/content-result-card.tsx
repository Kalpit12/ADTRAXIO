"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { GeneratedCreative } from "@/lib/content/types";

interface ContentResultCardProps {
  creative: GeneratedCreative;
  onRefine?: () => void;
  onVariation?: () => void;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm leading-relaxed text-foreground/90">
        {value}
      </p>
    </div>
  );
}

export function ContentResultCard({
  creative,
  onRefine,
  onVariation,
}: ContentResultCardProps) {
  return (
    <div className="my-3 max-w-full overflow-hidden rounded-lg border border-border/60 bg-adtraxio-surface/40 p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-adtraxio-accent">
        Content draft
      </p>
      <div className="mt-3 space-y-3">
        <Field label="Hook" value={creative.hook} />
        <Field label="Headline" value={creative.headline} />
        <Field label="Primary copy" value={creative.primaryCopy} />
        <Field label="CTA" value={creative.cta} />
        <Field label="Caption" value={creative.caption} />
        {creative.hashtags?.length ? (
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Hashtags
            </p>
            <p className="mt-1 break-words text-sm text-foreground/80">
              {creative.hashtags.join(" ")}
            </p>
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 pt-4">
        {onRefine && (
          <Button type="button" size="sm" variant="outline" onClick={onRefine}>
            Refine
          </Button>
        )}
        {onVariation && (
          <Button type="button" size="sm" variant="outline" onClick={onVariation}>
            Create variation
          </Button>
        )}
        <Button asChild size="sm" variant="secondary">
          <Link href="/create">Open in Content Studio</Link>
        </Button>
      </div>
    </div>
  );
}
