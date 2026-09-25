"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { OptimizationProposalRecord } from "@/lib/optimization/types";

export function OptimizationPageView() {
  const [items, setItems] = useState<OptimizationProposalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/optimization/proposals");
      const payload = (await res.json()) as { proposals?: OptimizationProposalRecord[] };
      setItems(payload.proposals ?? []);
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">Optimization readiness</h1>
          <Link
            href="/assistant/optimization/history"
            className="text-xs text-primary hover:underline"
          >
            Outcome history
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Review evidence-backed proposals. Human approval required before controlled allocation
          execution.
        </p>
      </div>
      <div className="p-6">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-muted-foreground">No optimization proposals yet.</p>
        )}
        <ul className="space-y-3">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                href={`/assistant/optimization/${p.id}`}
                className="block rounded-xl border border-border/60 p-4 hover:bg-muted/30"
              >
                <p className="font-medium capitalize">
                  {p.proposalType.replace(/_/g, " ")} · {p.status}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Eligibility: {p.eligibility.status} · Risk: {p.risk.level} · Expires{" "}
                  {new Date(p.expiresAt).toLocaleString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
