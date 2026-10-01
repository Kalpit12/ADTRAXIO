import { getConnectionStatusDisplay } from "@/lib/social/connection-display";
import type { SocialAccountStatus } from "@/lib/social/types";
import { cn } from "@/lib/utils";

interface SocialConnectionStatusProps {
  status: SocialAccountStatus | string;
  showDescription?: boolean;
  className?: string;
}

export function SocialConnectionStatus({
  status,
  showDescription = false,
  className,
}: SocialConnectionStatusProps) {
  const display = getConnectionStatusDisplay(status);

  const borderClass =
    display.tone === "ok"
      ? "border-adtraxio-accent/30 text-foreground"
      : display.tone === "attention"
        ? "border-amber-500/35 text-amber-100/90"
        : "border-border/70 text-muted-foreground";

  return (
    <span className={cn("inline-flex flex-col gap-0.5", className)}>
      <span
        className={cn(
          "inline-flex w-fit rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
          borderClass
        )}
      >
        {display.label}
      </span>
      {showDescription && display.description && (
        <span className="text-[10px] text-muted-foreground">
          {display.description}
        </span>
      )}
    </span>
  );
}
