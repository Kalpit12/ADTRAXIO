import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  positive = true,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-adtraxio-surface-elevated/80 p-3",
        className
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {change && (
        <p
          className={cn(
            "mt-0.5 flex items-center gap-0.5 text-[11px] font-medium",
            positive ? "text-adtraxio-accent" : "text-red-400"
          )}
        >
          {positive && <TrendingUp className="size-3" />}
          {change}
        </p>
      )}
    </div>
  );
}
