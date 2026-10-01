"use client";

import {
  CONTENT_PLATFORM_LABELS,
  CONTENT_TYPE_LABELS,
} from "@/lib/content/constants";
import type { ContentDraftSummary } from "@/lib/content/types";
import { cn } from "@/lib/utils";

interface RecentDraftsProps {
  drafts: ContentDraftSummary[];
  activeDraftId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
}

export function RecentDrafts({
  drafts,
  activeDraftId,
  loading,
  onSelect,
}: RecentDraftsProps) {
  if (loading) {
    return (
      <section className="border-t border-border/60 pt-8">
        <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Recent drafts
        </h3>
        <div className="mt-4 h-16 animate-pulse rounded-md bg-secondary/25" />
      </section>
    );
  }

  if (drafts.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-border/60 pt-8">
      <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Recent drafts
      </h3>
      <ul className="mt-4 divide-y divide-border/50">
        {drafts.map((draft) => (
          <li key={draft.id}>
            <button
              type="button"
              onClick={() => onSelect(draft.id)}
              className={cn(
                "flex w-full items-start justify-between gap-4 py-3 text-left transition-colors hover:bg-white/[0.02]",
                activeDraftId === draft.id && "bg-white/[0.03]"
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {draft.headline || "Untitled draft"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {CONTENT_PLATFORM_LABELS[draft.platform]} ·{" "}
                  {CONTENT_TYPE_LABELS[draft.contentType]}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs capitalize text-muted-foreground">
                  {draft.status}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/70">
                  {new Date(draft.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
