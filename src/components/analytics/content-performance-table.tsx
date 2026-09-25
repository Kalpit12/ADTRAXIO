"use client";

import { useMemo, useState } from "react";
import { PlatformIcon } from "@/components/dashboard/platform-icon";
import type { ContentPerformanceRow } from "@/lib/analytics/types";

type SortKey = "engagement" | "impressions" | "reach" | "newest";

interface ContentPerformanceTableProps {
  rows: ContentPerformanceRow[];
}

function formatValue(value: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString();
}

function formatRate(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}%`;
}

export function ContentPerformanceTable({ rows }: ContentPerformanceTableProps) {
  const [sortBy, setSortBy] = useState<SortKey>("newest");

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

      return (b[field] ?? -1) - (a[field] ?? -1);
    });
    return copy;
  }, [rows, sortBy]);

  if (rows.length === 0) {
    return (
      <section className="rounded-lg border border-border/60 p-5 sm:p-6">
        <p className="text-xs font-medium text-muted-foreground">Content performance</p>
        <p className="mt-4 text-sm text-muted-foreground">
          Published content insights will appear here once synced.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border/60 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Content performance</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Published posts</h2>
        </div>
        <label className="text-xs text-muted-foreground">
          Sort by
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortKey)}
            className="mt-1 block rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="engagement">Engagement</option>
            <option value="impressions">Impressions</option>
            <option value="reach">Reach</option>
            <option value="newest">Newest</option>
          </select>
        </label>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border/60 text-xs text-muted-foreground">
              <th className="px-2 py-3 font-medium">Content</th>
              <th className="px-2 py-3 font-medium">Platform</th>
              <th className="px-2 py-3 font-medium">Published</th>
              <th className="px-2 py-3 font-medium">Impressions</th>
              <th className="px-2 py-3 font-medium">Reach</th>
              <th className="px-2 py-3 font-medium">Engagement</th>
              <th className="px-2 py-3 font-medium">Rate</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.id} className="border-b border-border/40 align-top">
                <td className="max-w-xs px-2 py-3">
                  <p className="line-clamp-2 text-foreground">
                    {row.caption ?? "Published post"}
                  </p>
                  {!row.platformPostId && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Insights unavailable
                    </p>
                  )}
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform={row.platform} size="sm" />
                    <span className="capitalize">{row.platform}</span>
                  </div>
                </td>
                <td className="px-2 py-3 text-muted-foreground">
                  {row.publishedAt
                    ? new Date(row.publishedAt).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-2 py-3">{formatValue(row.impressions)}</td>
                <td className="px-2 py-3">{formatValue(row.reach)}</td>
                <td className="px-2 py-3">{formatValue(row.engagement)}</td>
                <td className="px-2 py-3">{formatRate(row.engagementRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
