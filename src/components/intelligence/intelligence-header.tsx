import { Button } from "@/components/ui/button";

interface IntelligenceHeaderProps {
  analyzing: boolean;
  onAnalyze: () => void;
  periodLabel?: string;
}

export function IntelligenceHeader({
  analyzing,
  onAnalyze,
  periodLabel = "Last 30 days",
}: IntelligenceHeaderProps) {
  return (
    <header className="border-b border-border/60 pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Growth Intelligence
          </p>
          <h1 className="font-heading mt-1 text-3xl tracking-tight text-foreground sm:text-4xl">
            Growth Intelligence
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Understand what your data is telling you — grounded in your actual
            performance, not generic advice.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Period: {periodLabel}</p>
        </div>
        <Button size="sm" onClick={onAnalyze} disabled={analyzing}>
          {analyzing ? "Analyzing your recent performance…" : "Analyze performance"}
        </Button>
      </div>
    </header>
  );
}
