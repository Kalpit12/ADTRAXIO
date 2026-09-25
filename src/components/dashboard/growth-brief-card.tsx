"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { GrowthBriefSummary } from "@/lib/agent/types";

export function GrowthBriefCard() {
  const [summary, setSummary] = useState<GrowthBriefSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agent/brief?latest=1&type=weekly")
      .then(async (res) => {
        const payload = (await res.json()) as { summary?: GrowthBriefSummary | null };
        if (res.ok) setSummary(payload.summary ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-24 animate-pulse rounded-lg border border-border/50 bg-secondary/20" />
    );
  }

  if (!summary) {
    return (
      <div className="rounded-lg border border-border/60 bg-adtraxio-surface/20 px-4 py-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          ADTRAXIO AI
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Generate a growth brief from ADTRAXIO AI to see what changed this week.
        </p>
        <Link
          href="/assistant/briefs"
          className="mt-3 inline-block text-xs font-medium text-adtraxio-accent hover:underline"
        >
          Open growth briefs →
        </Link>
      </div>
    );
  }

  const bullets: string[] = [];
  if (summary.engagementChangePercent != null) {
    const sign = summary.engagementChangePercent > 0 ? "+" : "";
    bullets.push(`${sign}${summary.engagementChangePercent}% engagement`);
  }
  if (summary.topInsightTitles.length > 0) {
    bullets.push(summary.topInsightTitles[0]);
  }
  if (summary.failedPostsCount > 0) {
    bullets.push(`${summary.failedPostsCount} publishing issue${summary.failedPostsCount === 1 ? "" : "s"}`);
  }

  return (
    <div className="rounded-lg border border-border/60 bg-adtraxio-surface/20 px-4 py-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        ADTRAXIO AI · This week&apos;s growth brief
      </p>
      <p className="mt-2 line-clamp-2 text-sm text-foreground/90">{summary.summary}</p>
      {bullets.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {bullets.slice(0, 3).map((b) => (
            <li key={b}>· {b}</li>
          ))}
        </ul>
      )}
      <Link
        href={`/assistant/briefs/${summary.id}`}
        className="mt-3 inline-block text-xs font-medium text-adtraxio-accent hover:underline"
      >
        View growth brief →
      </Link>
    </div>
  );
}
