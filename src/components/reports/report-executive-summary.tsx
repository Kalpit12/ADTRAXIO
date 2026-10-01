import type { ReportSnapshotData } from "@/lib/reporting/types";

interface ReportExecutiveSummaryProps {
  aiSummary: NonNullable<ReportSnapshotData["aiSummary"]>;
}

export function ReportExecutiveSummary({ aiSummary }: ReportExecutiveSummaryProps) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Executive summary
        </p>
        <h2 className="font-heading text-xl tracking-tight text-foreground">
          Strategic briefing
        </h2>
      </div>
      <div className="border-l-2 border-adtraxio-accent/30 pl-5">
        <p className="text-sm leading-relaxed text-foreground/95">
          {aiSummary.executiveSummary}
        </p>
        {aiSummary.keyObservations.length > 0 && (
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {aiSummary.keyObservations.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-foreground/40" aria-hidden>—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
