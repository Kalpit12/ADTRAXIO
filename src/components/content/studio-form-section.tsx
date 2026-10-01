interface StudioFormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function StudioFormSection({
  title,
  description,
  children,
}: StudioFormSectionProps) {
  return (
    <section className="space-y-4 border-b border-border/40 pb-6 last:border-0 last:pb-0">
      <div>
        <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground/90">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
