"use client";

interface ReportAnalysisCardProps {
  reportName: string;
  period?: { from: string; to: string } | null;
  highlights?: Array<{ label: string; value: string }>;
}

export function ReportAnalysisCard({
  reportName,
  period,
  highlights,
}: ReportAnalysisCardProps) {
  const items = highlights?.filter((h) => h.value) ?? [];
  if (!reportName) return null;

  return (
    <div className="my-3 max-w-full overflow-hidden rounded-lg border border-border/60 bg-adtraxio-surface/40 p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Report analysis
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground">{reportName}</p>
      {period && (
        <p className="mt-1 text-xs text-muted-foreground">
          {period.from} – {period.to}
        </p>
      )}
      {items.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {item.label}
              </p>
              <p className="text-sm font-medium tabular-nums text-foreground">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
