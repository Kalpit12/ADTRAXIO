"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExperimentRecord } from "@/lib/experiments/types";

export function ExperimentsPageView() {
  const [items, setItems] = useState<ExperimentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/experiments?limit=40");
      const payload = (await res.json()) as { experiments?: ExperimentRecord[] };
      setItems(payload.experiments ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="border-b border-border/60 px-6 py-4">
        <Link
          href="/assistant"
          className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Assistant
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Experiments</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Controlled A/B tests. You approve and start experiments — ADTRAXIO does not auto-allocate
              traffic or spend.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/assistant/experiments/history">History</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/assistant/experiments/new">
              <Plus className="mr-1 h-3.5 w-3.5" />
              New
            </Link>
          </Button>
        </div>
      </div>
      <div className="p-6">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-muted-foreground">No experiments yet.</p>
        )}
        <ul className="space-y-3">
          {items.map((e) => (
            <li key={e.id}>
              <Link
                href={`/assistant/experiments/${e.id}`}
                className="block rounded-xl border border-border/60 p-4 hover:bg-muted/30"
              >
                <p className="font-medium">{e.name}</p>
                <p className="mt-1 text-xs capitalize text-muted-foreground">
                  {e.status} · {e.successMetric} · {e.minimumObservationDays}d window
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
