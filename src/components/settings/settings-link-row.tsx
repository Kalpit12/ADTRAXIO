import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsLinkRowProps {
  href: string;
  title: string;
  description: string;
  className?: string;
}

export function SettingsLinkRow({
  href,
  title,
  description,
  className,
}: SettingsLinkRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center justify-between gap-4 rounded-md border border-transparent px-1 py-3 transition-colors hover:border-border/50 hover:bg-secondary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-adtraxio-accent/40",
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        aria-hidden
      />
    </Link>
  );
}
