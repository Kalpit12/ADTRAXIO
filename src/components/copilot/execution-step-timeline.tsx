import { cn } from "@/lib/utils";
import { ActionStatusBadge } from "@/components/copilot/action-status-badge";

export type TimelineStepStatus =
  | "draft"
  | "ready"
  | "pending"
  | "approved"
  | "executing"
  | "completed"
  | "failed"
  | "rolled_back"
  | "locked";

function mapExecutionStatus(status: string): TimelineStepStatus {
  switch (status) {
    case "completed":
    case "done":
      return "completed";
    case "running":
    case "executing":
      return "executing";
    case "failed":
      return "failed";
    case "ready":
    case "needs_review":
      return "ready";
    case "approved":
      return "approved";
    case "pending":
    case "waiting":
      return "pending";
    case "locked":
    case "blocked":
      return "locked";
    default:
      return "draft";
  }
}

interface ExecutionStepTimelineProps {
  steps: Array<{
    id: string;
    index: number;
    title: string;
    status: string;
    detail?: string;
    children?: React.ReactNode;
  }>;
}

export function ExecutionStepTimeline({ steps }: ExecutionStepTimelineProps) {
  return (
    <ol className="space-y-0">
      {steps.map((step, i) => {
        const visual = mapExecutionStatus(step.status);
        const isLast = i === steps.length - 1;

        return (
          <li key={step.id} className="relative flex gap-4 pb-6">
            {!isLast && (
              <span
                className="absolute left-[11px] top-8 h-[calc(100%-1rem)] w-px bg-border/60"
                aria-hidden
              />
            )}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium tabular-nums",
                  visual === "completed" &&
                    "border-adtraxio-accent/40 bg-adtraxio-accent/10 text-foreground",
                  visual === "failed" && "border-red-500/40 text-red-300",
                  visual === "locked" && "border-border/50 text-muted-foreground",
                  visual !== "completed" &&
                    visual !== "failed" &&
                    visual !== "locked" &&
                    "border-border/70 text-muted-foreground"
                )}
              >
                {step.index}
              </span>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">{step.title}</p>
                {visual !== "locked" && (
                  <ActionStatusBadge status={visual} />
                )}
                {visual === "locked" && (
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Locked
                  </span>
                )}
              </div>
              {step.detail && (
                <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
              )}
              {step.children}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
