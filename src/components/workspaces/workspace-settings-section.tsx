import { cn } from "@/lib/utils";

interface WorkspaceSettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function WorkspaceSettingsSection({
  title,
  description,
  children,
  className,
}: WorkspaceSettingsSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </p>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="rounded-md border border-border/60 px-4 py-4 sm:px-5">
        {children}
      </div>
    </section>
  );
}
