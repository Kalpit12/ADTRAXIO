"use client";

interface AssistantLoadingProps {
  label?: string;
}

export function AssistantLoading({ label = "Working on your request" }: AssistantLoadingProps) {
  return (
    <div
      className="flex w-full justify-start border-l border-border/50 pl-4 sm:pl-5"
      role="status"
      aria-live="polite"
    >
      <div className="min-w-0 space-y-2 py-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Copilot
        </p>
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="flex gap-1 pt-1" aria-hidden>
          <span className="size-1 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
          <span className="size-1 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
          <span className="size-1 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
