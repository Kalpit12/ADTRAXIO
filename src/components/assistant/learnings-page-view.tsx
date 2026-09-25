"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { LearningOutcomeRecord } from "@/lib/learning/types";

export function LearningsPageView() {
  const [items, setItems] = useState<LearningOutcomeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/learning/outcomes?limit=30");
      const payload = (await res.json()) as { outcomes?: LearningOutcomeRecord[] };
      setItems(payload.outcomes ?? []);
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
        <h1 className="text-lg font-semibold">AI learnings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Measured outcomes after recommendations and executions. Learning informs strategy — it
          never executes actions.
        </p>
      </div>
      <div className="p-6">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No learning outcomes yet. Complete an execution plan to start measuring results.
          </p>
        )}
        <ul className="space-y-4">
          {items.map((o) => (
            <li key={o.id} className="rounded-xl border border-border/60 p-4">
              <p className="text-sm font-medium">{o.objective}</p>
              <p className="mt-1 text-xs capitalize text-muted-foreground">
                {o.status} · {o.confidence}
                {o.platform ? ` · ${o.platform}` : ""}
              </p>
              {(o.learning as { whatWorked?: string[] }).whatWorked?.length ? (
                <div className="mt-2">
                  <p className="text-xs font-medium text-adtraxio-accent">What worked</p>
                  <ul className="list-disc pl-4 text-sm text-foreground/85">
                    {(o.learning as { whatWorked: string[] }).whatWorked.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {(o.learning as { whatDidNotWork?: string[] }).whatDidNotWork?.length ? (
                <div className="mt-2">
                  <p className="text-xs font-medium text-muted-foreground">What did not</p>
                  <ul className="list-disc pl-4 text-sm text-foreground/85">
                    {(o.learning as { whatDidNotWork: string[] }).whatDidNotWork.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
