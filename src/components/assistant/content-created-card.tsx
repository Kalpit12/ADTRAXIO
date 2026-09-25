"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ContentCreatedCardProps {
  count: number;
  contentIds?: string[];
}

export function ContentCreatedCard({ count, contentIds }: ContentCreatedCardProps) {
  if (count <= 0) return null;

  return (
    <div className="my-3 max-w-full rounded-lg border border-border/60 bg-adtraxio-surface/40 p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-adtraxio-accent">
        Content created
      </p>
      <p className="mt-2 text-sm text-foreground">
        {count} draft{count === 1 ? "" : "s"} created.
      </p>
      {contentIds && contentIds.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground font-mono">
          {contentIds.slice(0, 3).join(", ")}
          {contentIds.length > 3 ? "…" : ""}
        </p>
      )}
      <Button asChild size="sm" variant="secondary" className="mt-3">
        <Link href="/create">Open Content Studio</Link>
      </Button>
    </div>
  );
}
