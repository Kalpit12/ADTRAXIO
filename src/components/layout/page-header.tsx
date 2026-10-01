import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

/** Shared app page header — matches public marketing hierarchy. */
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 border-b border-border/60 pb-7 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow && (
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/90">
            {eyebrow}
          </p>
        )}
        <h1 className="font-heading text-3xl tracking-tight text-foreground sm:text-4xl lg:text-[2.65rem] lg:leading-tight">
          {title}
        </h1>
        {description && (
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 flex-wrap gap-2.5">{children}</div>
      )}
    </header>
  );
}
