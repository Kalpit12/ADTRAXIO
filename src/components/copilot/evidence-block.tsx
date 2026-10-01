import { cn } from "@/lib/utils";

export type EvidenceSource =
  | "analytics"
  | "campaign"
  | "content"
  | "experiment"
  | "learning"
  | "report"
  | "general";

const SOURCE_LABEL: Record<EvidenceSource, string> = {
  analytics: "Analytics",
  campaign: "Campaign",
  content: "Content",
  experiment: "Experiment",
  learning: "Learning",
  report: "Report",
  general: "Evidence",
};

interface EvidenceBlockProps {
  source?: EvidenceSource;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function EvidenceBlock({
  source = "general",
  title,
  children,
  className,
}: EvidenceBlockProps) {
  return (
    <div
      className={cn(
        "my-3 border-l-2 border-adtraxio-accent/35 pl-4",
        className
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {title ?? SOURCE_LABEL[source]}
      </p>
      <div className="mt-2 text-sm text-foreground/90">{children}</div>
    </div>
  );
}
