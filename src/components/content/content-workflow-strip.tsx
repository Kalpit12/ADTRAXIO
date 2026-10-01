import { cn } from "@/lib/utils";

const STEPS = [
  { id: "brief", label: "Brief" },
  { id: "generate", label: "Generate" },
  { id: "review", label: "Review" },
  { id: "edit", label: "Edit" },
  { id: "save", label: "Save" },
] as const;

export type WorkflowStepId = (typeof STEPS)[number]["id"];

interface ContentWorkflowStripProps {
  activeStep: WorkflowStepId;
}

export function ContentWorkflowStrip({ activeStep }: ContentWorkflowStripProps) {
  const activeIndex = STEPS.findIndex((s) => s.id === activeStep);

  return (
    <nav
      aria-label="Content workflow"
      className="flex flex-wrap gap-1 border-b border-border/50 pb-4"
    >
      {STEPS.map((step, index) => {
        const done = index < activeIndex;
        const current = step.id === activeStep;

        return (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
              current && "bg-white/[0.05] text-foreground ring-1 ring-adtraxio-accent/20",
              done && !current && "text-muted-foreground",
              !done && !current && "text-muted-foreground/60"
            )}
          >
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full border text-[10px] tabular-nums",
                current && "border-adtraxio-accent/40 text-foreground",
                done && "border-border/60 text-muted-foreground",
                !done && !current && "border-border/40"
              )}
              aria-hidden
            >
              {index + 1}
            </span>
            <span>{step.label}</span>
          </div>
        );
      })}
    </nav>
  );
}
