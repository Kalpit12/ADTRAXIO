"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface StrategyPlanCardData {
  planId: string;
  title: string;
  objective?: string;
  platforms?: string[];
  contentPillars?: Array<{ name: string; reason?: string }>;
  cadence?: string;
}

interface StrategyPlanCardProps {
  plan: StrategyPlanCardData;
  onReview?: () => void;
}

export function StrategyPlanCard({ plan, onReview }: StrategyPlanCardProps) {
  const pillars = plan.contentPillars ?? [];
  const platforms = plan.platforms ?? [];

  return (
    <div className="my-3 max-w-full overflow-hidden rounded-lg border border-border/60 bg-adtraxio-surface/40 p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-adtraxio-accent">
        Strategy plan
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground">{plan.title}</p>
      {plan.objective && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Objective
          </p>
          <p className="mt-1 text-sm text-foreground/90">{plan.objective}</p>
        </div>
      )}
      {platforms.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Platforms
          </p>
          <p className="mt-1 text-sm text-foreground/85">
            {platforms.join(" · ")}
          </p>
        </div>
      )}
      {pillars.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Content pillars
          </p>
          <ul className="mt-1 space-y-1 text-sm text-foreground/85">
            {pillars.slice(0, 4).map((pillar) => (
              <li key={pillar.name}>
                {pillar.name}
                {pillar.reason ? (
                  <span className="text-muted-foreground"> — {pillar.reason}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
      {plan.cadence && (
        <p className="mt-3 text-xs text-muted-foreground">
          Cadence: {plan.cadence}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 pt-4">
        {onReview && (
          <Button type="button" size="sm" variant="outline" onClick={onReview}>
            Review plan
          </Button>
        )}
        <Button asChild size="sm" variant="secondary">
          <Link href="/assistant">Open assistant</Link>
        </Button>
      </div>
    </div>
  );
}
