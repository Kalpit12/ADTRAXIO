import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ConnectionEmptyStateProps {
  canConnect: boolean;
}

export function ConnectionEmptyState({ canConnect }: ConnectionEmptyStateProps) {
  return (
    <div className="rounded-md border border-border/60 bg-adtraxio-surface/10 px-6 py-12 text-center sm:px-10">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Social connections
      </p>
      <p className="mt-3 font-heading text-xl tracking-tight text-foreground">
        Connect your first social account
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Connect the platforms you use to publish content and understand performance.
        Your connection is managed securely for this workspace.
      </p>
      {canConnect && (
        <Button asChild size="sm" className="mt-6">
          <Link href="#available-connections">Connect account</Link>
        </Button>
      )}
    </div>
  );
}
