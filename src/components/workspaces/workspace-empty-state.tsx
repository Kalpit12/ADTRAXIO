import Link from "next/link";
import { Button } from "@/components/ui/button";

interface WorkspaceEmptyStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}

export function WorkspaceEmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: WorkspaceEmptyStateProps) {
  return (
    <div className="rounded-md border border-border/60 bg-adtraxio-surface/10 px-6 py-12 text-center sm:px-10">
      <p className="font-heading text-lg tracking-tight text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {actionHref && actionLabel && (
        <Button asChild size="sm" className="mt-6">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
