import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Connects Analytics → Intelligence → Copilot without duplicating AI output. */
export function AnalyticsInsightBridge() {
  return (
    <div className="flex flex-col gap-4 border-t border-border/60 pt-8 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
          What next
        </p>
        <p className="max-w-xl text-sm text-muted-foreground">
          Analytics shows what happened. Growth Intelligence explores why it may
          matter. Growth Copilot helps you decide what to do.
        </p>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link
          href="/intelligence"
          className="inline-flex items-center gap-1.5 font-medium text-foreground transition-colors hover:text-adtraxio-accent"
        >
          Growth Intelligence
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
        <Link
          href="/assistant"
          className="inline-flex items-center gap-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Growth Copilot
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
