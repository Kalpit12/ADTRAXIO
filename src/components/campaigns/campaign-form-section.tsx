interface CampaignFormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function CampaignFormSection({
  title,
  description,
  children,
}: CampaignFormSectionProps) {
  return (
    <section className="space-y-4 border-b border-border/50 pb-8 last:border-0">
      <div>
        <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
