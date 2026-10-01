"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ActionStatusBadge } from "@/components/copilot/action-status-badge";

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
    <div className="my-4 max-w-full overflow-hidden rounded-md border border-border/60 bg-adtraxio-surface/15">
      <div className="border-b border-border/50 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Strategy plan
          </p>
          <ActionStatusBadge status="draft" />
        </div>
        <p className="mt-2 font-heading text-base tracking-tight text-foreground">
          {plan.title}
        </p>
      </div>

      <div className="space-y-4 px-4 py-4 text-sm sm:px-5">
        {plan.objective && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Objective
            </p>
            <p className="mt-1 text-foreground/90">{plan.objective}</p>
          </div>
        )}
        {platforms.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Direction
            </p>
            <p className="mt-1 text-foreground/85">{platforms.join(" · ")}</p>
          </div>
        )}
        {pillars.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Content pillars
            </p>
            <ul className="mt-1 space-y-1 text-foreground/85">
              {pillars.slice(0, 4).map((pillar) => (
                <li key={pillar.name}>
                  {pillar.name}
                  {pillar.reason ? (
                    <span className="text-muted-foreground">
                      {" "}
                      — {pillar.reason}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
        {plan.cadence && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Measurement cadence
            </p>
            <p className="mt-1 text-muted-foreground">{plan.cadence}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border/50 px-4 py-3 sm:px-5">
        {onReview && (
          <Button type="button" size="sm" variant="outline" onClick={onReview}>
            Review plan
          </Button>
        )}
        <Button asChild size="sm" variant="secondary">
          <Link href={`/assistant/strategy/${plan.planId}`}>Open strategy</Link>
        </Button>
      </div>
    </div>
  );
}
