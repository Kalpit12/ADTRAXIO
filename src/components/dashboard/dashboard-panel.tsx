"use client";

import { cn } from "@/lib/utils";

interface DashboardSectionProps {
  children: React.ReactNode;
  className?: string;
}

/** Lightweight section wrapper — spacing only, no card chrome. */
export function DashboardSection({ children, className }: DashboardSectionProps) {
  return <section className={cn("py-1", className)}>{children}</section>;
}

interface DashboardSurfaceProps {
  children: React.ReactNode;
  className?: string;
}

/** Bordered surface for major functional zones (e.g. Performance). */
export function DashboardSurface({ children, className }: DashboardSurfaceProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-border/80 bg-adtraxio-surface/35",
        className
      )}
    >
      {children}
    </div>
  );
}

interface DashboardSectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function DashboardSectionHeader({
  title,
  description,
  action,
}: DashboardSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
