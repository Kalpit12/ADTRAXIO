import { cn } from "@/lib/utils";

interface AnalyticsSectionProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "flush";
}

export function AnalyticsSection({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
  variant = "default",
}: AnalyticsSectionProps) {
  return (
    <section
      className={cn(
        variant === "default" &&
          "rounded-lg border border-border/60 bg-adtraxio-surface/10",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
          variant === "default" ? "border-b border-border/50 px-5 py-4 sm:px-6" : "pb-3"
        )}
      >
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
              {eyebrow}
            </p>
          )}
          <h2 className="font-heading text-lg tracking-tight text-foreground sm:text-xl">
            {title}
          </h2>
          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={cn(variant === "default" && "px-5 py-5 sm:px-6 sm:py-6")}>
        {children}
      </div>
    </section>
  );
}
