import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ReportEmptyState() {
  return (
    <div className="rounded-md border border-border/60 bg-adtraxio-surface/10 px-6 py-12 text-center sm:px-10">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Client reports
      </p>
      <p className="mt-3 font-heading text-xl tracking-tight text-foreground">
        No reports yet
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Turn campaign and growth data into clear, client-ready reporting for this
        workspace.
      </p>
      <Button asChild size="sm" className="mt-6">
        <Link href="/reports/new">Create report</Link>
      </Button>
    </div>
  );
}
