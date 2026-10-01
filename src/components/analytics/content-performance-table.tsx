"use client";

import { useMemo, useState } from "react";
import { PlatformIcon } from "@/components/dashboard/platform-icon";
import {
  formatEngagementRate,
  formatMetricValue,
} from "@/lib/analytics/display";
import type { ContentPerformanceRow } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

type SortKey = "engagement" | "impressions" | "reach" | "newest";

interface ContentPerformanceTableProps {
  rows: ContentPerformanceRow[];
}

export function ContentPerformanceTable({ rows }: ContentPerformanceTableProps) {
  const [sortBy, setSortBy] = useState<SortKey>("engagement");

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      if (sortBy === "newest") {
        const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return bTime - aTime;
      }

      const field =
        sortBy === "engagement"
          ? "engagement"
          : sortBy === "impressions"
            ? "impressions"
            : "reach";

      const aVal = a[field];
      const bVal = b[field];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      return bVal - aVal;
    });
    return copy;
  }, [rows, sortBy]);

  if (rows.length === 0) {
    return (
      <section className="rounded-lg border border-border/60 bg-adtraxio-surface/10 px-5 py-6 sm:px-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
          Content
        </p>
        <h2 className="font-heading mt-1 text-lg tracking-tight text-foreground">
          Top performing posts
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Published post insights appear here after sync. Publish from Publishing
          or Campaigns, then refresh analytics.
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border border-border/60 bg-adtraxio-surface/10"
      aria-labelledby="content-performance-title"
    >
      <div className="flex flex-col gap-3 border-b border-border/50 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
            Content
          </p>
          <h2
            id="content-performance-title"
            className="font-heading text-lg tracking-tight text-foreground"
          >
            Top performing posts
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Which posts contributed to results in this period.
          </p>
        </div>
        <label className="text-xs text-muted-foreground">
          Sort by
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortKey)}
            className="mt-1 block min-h-10 rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-adtraxio-accent/40"
            aria-label="Sort content by metric"
          >
            <option value="engagement">Engagement</option>
            <option value="impressions">Impressions</option>
            <option value="reach">Reach</option>
            <option value="newest">Newest</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border/50 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              <th scope="col" className="px-5 py-3 font-medium sm:px-6">
                Content
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Platform
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Published
              </th>
              <th scope="col" className="px-3 py-3 font-medium text-right">
                Impressions
              </th>
              <th scope="col" className="px-3 py-3 font-medium text-right">
                Reach
              </th>
              <th scope="col" className="px-3 py-3 font-medium text-right">
                Engagement
              </th>
              <th scope="col" className="px-3 py-3 pr-5 font-medium text-right sm:pr-6">
                Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-border/40 align-top transition-colors",
                  "hover:bg-white/[0.02] focus-within:bg-white/[0.02]"
                )}
              >
                <td className="max-w-[16rem] px-5 py-4 sm:px-6">
                  <p className="line-clamp-2 font-medium text-foreground">
                    {row.caption ?? "Published post"}
                  </p>
                  {row.accountName && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {row.accountName}
                    </p>
                  )}
                  {!row.platformPostId && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Insights unavailable
                    </p>
                  )}
                </td>
                <td className="px-3 py-4">
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform={row.platform} size="sm" />
                    <span className="capitalize text-muted-foreground">
                      {row.platform}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-4 tabular-nums text-muted-foreground">
                  {row.publishedAt
                    ? new Date(row.publishedAt).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-3 py-4 text-right tabular-nums">
                  {formatMetricValue(row.impressions)}
                </td>
                <td className="px-3 py-4 text-right tabular-nums">
                  {formatMetricValue(row.reach)}
                </td>
                <td className="px-3 py-4 text-right tabular-nums">
                  {formatMetricValue(row.engagement)}
                </td>
                <td className="px-3 py-4 pr-5 text-right tabular-nums sm:pr-6">
                  {formatEngagementRate(row.engagementRate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
