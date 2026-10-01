import type { AccountCapability } from "@/lib/social/connection-display";
import { cn } from "@/lib/utils";

interface CapabilityListProps {
  capabilities: AccountCapability[];
  className?: string;
}

export function CapabilityList({ capabilities, className }: CapabilityListProps) {
  if (capabilities.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap gap-2", className)} aria-label="Available capabilities">
      {capabilities.map((cap) => (
        <li
          key={cap.id}
          className={cn(
            "rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em]",
            cap.available
              ? "border-border/70 text-muted-foreground"
              : "border-border/40 text-muted-foreground/50 line-through"
          )}
        >
          {cap.label}
        </li>
      ))}
    </ul>
  );
}
