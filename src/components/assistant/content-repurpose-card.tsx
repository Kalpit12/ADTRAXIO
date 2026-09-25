"use client";

import type { GeneratedCreative } from "@/lib/content/types";
import { ContentResultCard } from "@/components/assistant/content-result-card";

interface ContentRepurposeCardProps {
  sourceContentId: string;
  targetPlatform: string;
  creative: GeneratedCreative;
  onRefine?: () => void;
  onVariation?: () => void;
}

export function ContentRepurposeCard({
  sourceContentId,
  targetPlatform,
  creative,
  onRefine,
  onVariation,
}: ContentRepurposeCardProps) {
  return (
    <div className="my-3 max-w-full">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Repurposed for {targetPlatform}
        <span className="ml-2 font-mono text-[9px] text-muted-foreground/70">
          from {sourceContentId.slice(0, 8)}…
        </span>
      </p>
      <ContentResultCard
        creative={creative}
        onRefine={onRefine}
        onVariation={onVariation}
      />
    </div>
  );
}
