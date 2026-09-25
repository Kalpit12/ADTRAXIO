"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ExperimentHistoryItem } from "@/lib/experiments/types";
import { ExperimentCrossEvidenceSection } from "./experiment-cross-evidence-section";

export function ExperimentsHistoryView() {
  const [items, setItems] = useState<ExperimentHistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (search) params.set("search", search);
    if (platform) params.set("platform", platform);
    const res = await fetch(`/api/experiments/intelligence/history?${params}`);
    const payload = (await res.json()) as { history?: ExperimentHistoryItem[] };
    setItems(payload.history ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-border/60 px-6 py-4">
        <Link
          href="/assistant/experiments"
          className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Experiments
        </Link>
        <h1 className="text-lg font-semibold">Experiment history</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Completed experiments only. No rankings or artificial scores.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            placeholder="Platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          />
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted/40"
            onClick={() => void load()}
          >
            Apply
          </button>
        </div>
      </div>
      <div className="p-6 space-y-6">
        <ExperimentCrossEvidenceSection compact />
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/assistant/experiments/${item.id}`}
                className="block rounded-xl border border-border/60 p-4 hover:bg-muted/20"
              >
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.objective}</p>
                <p className="mt-1 text-xs capitalize">
                  {item.primaryMetric}
                  {item.evidenceQuality ? ` · ${item.evidenceQuality} evidence` : ""}
                  {item.observedSummary ? ` · ${item.observedSummary}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
