import { cn } from "@/lib/utils";

interface AdtraxioAiMarkProps {
  size?: "sm" | "md";
  className?: string;
}

export function AdtraxioAiMark({ size = "sm", className }: AdtraxioAiMarkProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded border border-adtraxio-accent/30 bg-adtraxio-accent/10 font-semibold text-adtraxio-accent",
        size === "sm" ? "size-6 text-[10px]" : "size-8 text-xs",
        className
      )}
      aria-hidden
    >
      AI
    </span>
  );
}
