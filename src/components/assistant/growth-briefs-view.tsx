"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GrowthBriefRecord } from "@/lib/agent/types";

export function GrowthBriefsView() {
  const [briefs, setBriefs] = useState<GrowthBriefRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/brief?history=1");
      const payload = (await res.json()) as {
        briefs?: GrowthBriefRecord[];
        error?: string;
      };
      if (!res.ok) {
        setError(payload.error ?? "Unable to load briefs.");
        return;
      }
      setBriefs(payload.briefs ?? []);
    } catch {
      setError("Unable to load briefs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function generate(type: "daily" | "weekly") {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, regenerate: true }),
      });
      const payload = (await res.json()) as {
        brief?: GrowthBriefRecord;
        error?: string;
      };
      if (!res.ok) {
        setError(payload.error ?? "Unable to generate brief.");
        return;
      }
      await load();
    } catch {
      setError("Unable to generate brief.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[820px] space-y-6 px-4 py-6">
        <Link
          href="/assistant"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to Growth Copilot
        </Link>

        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl tracking-tight">Growth briefs</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Proactive summaries from your workspace data.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={generating}
              onClick={() => void generate("daily")}
            >
              Generate daily
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={generating}
              onClick={() => void generate("weekly")}
            >
              Generate weekly
            </Button>
          </div>
        </header>

        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : briefs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No growth briefs yet. Generate a weekly brief to see what changed.
          </p>
        ) : (
          <ul className="space-y-3">
            {briefs.map((brief) => (
              <li key={brief.id}>
                <Link
                  href={`/assistant/briefs/${brief.id}`}
                  className="block rounded-xl border border-border/60 bg-adtraxio-surface/25 p-4 transition-colors hover:border-adtraxio-accent/30"
                >
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {brief.briefType} · {brief.status}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {brief.summary}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(brief.generatedAt).toLocaleString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
