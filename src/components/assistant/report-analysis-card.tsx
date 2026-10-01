"use client";

import { EvidenceBlock } from "@/components/copilot/evidence-block";

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
    <EvidenceBlock source="report" title="Evidence · Report">
      <p className="font-medium text-foreground">{reportName}</p>
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
    </EvidenceBlock>
  );
}
