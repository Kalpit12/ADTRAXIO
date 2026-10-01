import Link from "next/link";
import { Button } from "@/components/ui/button";

interface AnalyticsEmptyStateProps {
  variant: "no_accounts" | "no_published" | "no_data";
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function AnalyticsEmptyState({
  variant,
  onRefresh,
  refreshing = false,
}: AnalyticsEmptyStateProps) {
  if (variant === "no_accounts") {
    return (
      <div
        className="rounded-lg border border-border/60 bg-adtraxio-surface/10 px-6 py-12 text-center sm:px-10"
        role="status"
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
          No connected accounts
        </p>
        <p className="mt-3 font-heading text-xl tracking-tight text-foreground">
          Connect a channel to see performance
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Analytics pulls from connected Instagram and Facebook accounts. Link an
          account, publish content, then refresh data here.
        </p>
        <Button asChild size="sm" className="mt-6">
          <Link href="/social">Connect account</Link>
        </Button>
      </div>
    );
  }

  if (variant === "no_published") {
    return (
      <div
        className="rounded-lg border border-border/60 bg-adtraxio-surface/10 px-6 py-12 text-center sm:px-10"
        role="status"
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
          No published content
        </p>
        <p className="mt-3 font-heading text-xl tracking-tight text-foreground">
          Publish to start collecting insights
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Performance metrics appear after posts are live and Meta insights sync.
        </p>
        <Button asChild size="sm" variant="outline" className="mt-6">
          <Link href="/create">Create content</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-border/60 bg-adtraxio-surface/10 px-6 py-12 text-center sm:px-10"
      role="status"
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
        No data for this period
      </p>
      <p className="mt-3 font-heading text-xl tracking-tight text-foreground">
        Nothing to report yet
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Try a wider date range, publish new content, or refresh data once Meta
        insights are available for your accounts.
      </p>
      {onRefresh && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-6"
          disabled={refreshing}
          onClick={onRefresh}
        >
          {refreshing ? "Refreshing…" : "Refresh data"}
        </Button>
      )}
    </div>
  );
}
