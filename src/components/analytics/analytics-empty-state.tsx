import Link from "next/link";
import { Button } from "@/components/ui/button";

interface AnalyticsEmptyStateProps {
  variant: "no_accounts" | "no_published" | "no_data";
}

export function AnalyticsEmptyState({ variant }: AnalyticsEmptyStateProps) {
  if (variant === "no_accounts") {
    return (
      <div className="rounded-lg border border-border/60 px-6 py-10 text-center">
        <p className="text-base font-medium text-foreground">
          Connect a social account to start tracking performance.
        </p>
        <Button asChild size="sm" variant="outline" className="mt-5">
          <Link href="/social">Connect account</Link>
        </Button>
      </div>
    );
  }

  if (variant === "no_published") {
    return (
      <div className="rounded-lg border border-border/60 px-6 py-10 text-center">
        <p className="text-base font-medium text-foreground">
          Publish your first post to start collecting performance data.
        </p>
        <Button asChild size="sm" variant="outline" className="mt-5">
          <Link href="/create">Create content</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 px-6 py-10 text-center">
      <p className="text-base font-medium text-foreground">
        Performance data is not available yet.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Refresh data after publishing, or check back once Meta insights are available.
      </p>
    </div>
  );
}
