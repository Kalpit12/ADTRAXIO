import { cn } from "@/lib/utils";

interface CopilotResponseFrameProps {
  children: React.ReactNode;
  className?: string;
}

/** Assistant message container — workspace tone, not chat bubbles. */
export function CopilotResponseFrame({
  children,
  className,
}: CopilotResponseFrameProps) {
  return (
    <article
      className={cn(
        "min-w-0 flex-1 border-l border-border/60 pl-4 sm:pl-5",
        className
      )}
    >
      {children}
    </article>
  );
}
