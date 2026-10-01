import { cn } from "@/lib/utils";
import type { CreativeWorkflowStep } from "@/lib/content/creative-studio-types";

const STEPS: { id: CreativeWorkflowStep; label: string }[] = [
  { id: "brief", label: "Brief" },
  { id: "concept", label: "Concept" },
  { id: "assets", label: "Assets" },
  { id: "compose", label: "Compose" },
  { id: "review", label: "Review" },
];

export function CreativeWorkflowStrip({
  activeStep,
}: {
  activeStep: CreativeWorkflowStep;
}) {
  const activeIndex = STEPS.findIndex((s) => s.id === activeStep);

  return (
    <nav aria-label="Creative workflow" className="overflow-x-auto">
      <ol className="flex min-w-0 gap-2 pb-1">
        {STEPS.map((step, index) => {
          const isActive = step.id === activeStep;
          const isComplete = index < activeIndex;
          return (
            <li key={step.id} className="shrink-0">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium",
                  isActive &&
                    "border-adtraxio-accent/35 bg-white/[0.04] text-foreground",
                  isComplete && "border-border/60 text-muted-foreground",
                  !isActive &&
                    !isComplete &&
                    "border-border/50 text-muted-foreground"
                )}
                aria-current={isActive ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[10px]",
                    isActive && "bg-adtraxio-accent/20 text-foreground",
                    !isActive && "bg-muted/40"
                  )}
                >
                  {index + 1}
                </span>
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
