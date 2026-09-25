"use client";

import Link from "next/link";
import { FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-panel";
import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { cn } from "@/lib/utils";
import { formatPlatformLabel } from "@/lib/dashboard/service";
import type { DashboardContentItem } from "@/lib/dashboard/types";

const STATUS_STYLES: Record<DashboardContentItem["status"], string> = {
  draft: "text-muted-foreground",
  scheduled: "text-amber-300",
  published: "text-adtraxio-accent",
  failed: "text-red-400",
};

interface RecentContentProps {
  items: DashboardContentItem[];
}

function ContentThumbnail({ item }: { item: DashboardContentItem }) {
  if (item.thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.thumbnailUrl}
        alt=""
        className="size-full object-cover"
      />
    );
  }

  return (
    <div className="flex size-full items-center justify-center bg-secondary/30">
      <FileImage className="size-4 text-muted-foreground" />
    </div>
  );
}

export function RecentContent({ items }: RecentContentProps) {
  if (items.length === 0) {
    return (
      <section>
        <DashboardSectionHeader title="Recent Content" />
        <div className="mt-6 py-8">
          <p className="text-base font-semibold text-foreground">
            Your creative workspace is waiting.
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Create your first post, ad, or video.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-5">
            <Link href="/create">Create content</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <DashboardSectionHeader
        title="Recent Content"
        action={
          <Link
            href="/create"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        }
      />

      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex gap-3 border-b border-border/50 py-3 last:border-0"
          >
            <div className="size-14 shrink-0 overflow-hidden rounded-md border border-border/60">
              <ContentThumbnail item={item} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <PlatformIcon platform={item.platform} size="sm" />
                <p className="truncate text-sm font-medium text-foreground">
                  {item.title}
                </p>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatPlatformLabel(item.platform)} · {item.contentType}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    "font-medium capitalize",
                    STATUS_STYLES[item.status]
                  )}
                >
                  {item.status}
                </span>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
