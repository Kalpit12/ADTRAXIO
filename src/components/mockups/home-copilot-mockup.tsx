"use client";

import { Button } from "@/components/ui/button";
import { CopilotSection } from "@/components/copilot/copilot-section";

const ACTIONS = [
  {
    step: "01",
    title: "Create 3 educational Reels",
    reason:
      "Educational content is generating stronger reach than promotional posts.",
  },
  {
    step: "02",
    title: "Schedule Tuesday + Thursday",
    reason: "These are the strongest available engagement windows.",
  },
  {
    step: "03",
    title: "Review Lead Gen campaign",
    reason: "Performance is below the current target.",
  },
] as const;

/** Illustrative Growth Copilot recommendations — not live data or chat UI. */
export function HomeCopilotMockup() {
  return (
    <div
      className="rounded-lg border border-border bg-adtraxio-surface/50 p-1"
      role="img"
      aria-label="Illustration of Growth Copilot strategic recommendations based on recent performance"
    >
      <div className="rounded-md border border-border bg-background p-4 sm:p-5">
        <header className="border-b border-border/60 pb-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Growth Copilot
          </p>
          <p className="mt-2 font-heading text-lg tracking-tight text-foreground sm:text-xl">
            What should we do next?
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Based on recent performance — data, reasoning, then action.
          </p>
        </header>

        <ol className="mt-4 space-y-3" aria-hidden>
          {ACTIONS.map((action) => (
            <li
              key={action.step}
              className="rounded-md border border-border/60 bg-adtraxio-surface/20 px-3 py-3 sm:px-4"
            >
              <div className="flex gap-3">
                <span
                  className="font-mono text-[10px] tabular-nums text-adtraxio-accent"
                  aria-hidden
                >
                  {action.step}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {action.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {action.reason}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <CopilotSection
          variant="inset"
          className="mt-4 border-0 bg-transparent p-0"
          eyebrow="Next"
          title="Suggested plan"
        >
          <p className="text-xs leading-relaxed text-muted-foreground">
            Turn these recommendations into an approvable growth plan in your
            workspace.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3 pointer-events-none"
            tabIndex={-1}
            aria-hidden
          >
            Create growth plan
          </Button>
        </CopilotSection>
      </div>
    </div>
  );
}
