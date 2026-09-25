"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LearningOutcomeRecord } from "@/lib/learning/types";

export function LearningOutcomesPanel({
  executionPlanId,
  strategicPlanId,
  title = "Learning outcomes",
}: {
  executionPlanId?: string;
  strategicPlanId?: string;
  title?: string;
}) {
  const [items, setItems] = useState<LearningOutcomeRecord[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/learning/outcomes?limit=20");
      const payload = (await res.json()) as { outcomes?: LearningOutcomeRecord[] };
      let list = payload.outcomes ?? [];
      if (executionPlanId) {
        list = list.filter((o) => o.executionPlanId === executionPlanId);
      }
      if (strategicPlanId) {
        list = list.filter((o) => o.strategicPlanId === strategicPlanId);
      }
      setItems(list);
    })();
  }, [executionPlanId, strategicPlanId]);

  if (!items.length) return null;

  return (
    <section className="mt-6 rounded-xl border border-border/60 bg-adtraxio-surface/20 p-4">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      <ul className="mt-3 space-y-3">
        {items.map((o) => (
          <li key={o.id} className="text-sm">
            <p className="font-medium text-foreground/90">{o.objective}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {o.status} · {o.confidence} confidence
              {o.measuredAt ? ` · measured ${new Date(o.measuredAt).toLocaleDateString()}` : ` · measure after ${new Date(o.measureAfter).toLocaleDateString()}`}
            </p>
            {(o.learning as { summary?: string }).summary && (
              <p className="mt-1 text-foreground/85">
                {(o.learning as { summary?: string }).summary}
              </p>
            )}
            {o.comparison.rows.length > 0 && (
              <ul className="mt-2 text-xs text-muted-foreground">
                {o.comparison.rows
                  .filter((r) => r.availability === "measured")
                  .slice(0, 3)
                  .map((r) => (
                    <li key={r.metric}>
                      {r.metric}: {r.baseline ?? "—"} → {r.outcome ?? "—"}
                      {r.percentChange != null ? ` (${r.percentChange}%)` : ""}
                    </li>
                  ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <Link href="/assistant/learnings" className="mt-3 inline-block text-xs text-adtraxio-accent hover:underline">
        View all learnings
      </Link>
    </section>
  );
}
