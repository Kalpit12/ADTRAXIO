import Link from "next/link";
import { Button } from "@/components/ui/button";

type EmptyVariant =
  | "no_accounts"
  | "no_data"
  | "insufficient"
  | "no_generation"
  | "ai_unavailable";

const COPY: Record<
  EmptyVariant,
  { title: string; description: string; cta?: string; href?: string }
> = {
  no_accounts: {
    title: "Connect a social account",
    description: "Connect a social account to generate growth insights.",
    cta: "Connect account",
    href: "/social",
  },
  no_data: {
    title: "Collect performance data first",
    description:
      "Publish content and collect performance data before generating insights.",
    cta: "Go to Publishing",
    href: "/publishing",
  },
  insufficient: {
    title: "Not enough data yet",
    description:
      "There's not enough historical data to make a reliable recommendation yet.",
  },
  no_generation: {
    title: "No insights generated yet",
    description:
      "Analyze your performance to understand what changed and what to consider next.",
    cta: "Analyze performance",
    href: "/intelligence",
  },
  ai_unavailable: {
    title: "Growth Intelligence unavailable",
    description:
      "Growth Intelligence is temporarily unavailable. Your analytics are still available.",
    cta: "View analytics",
    href: "/analytics",
  },
};

interface IntelligenceEmptyStateProps {
  variant: EmptyVariant;
  onAnalyze?: () => void;
  compact?: boolean;
}

export function IntelligenceEmptyState({
  variant,
  onAnalyze,
  compact = false,
}: IntelligenceEmptyStateProps) {
  const copy = COPY[variant];

  return (
    <div className={compact ? "py-2" : "rounded-lg border border-border/60 px-5 py-8"}>
      <p className={`font-medium text-foreground ${compact ? "text-sm" : "text-base"}`}>
        {copy.title}
      </p>
      <p
        className={`mt-2 leading-relaxed text-muted-foreground ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        {copy.description}
      </p>
      {variant === "no_generation" && onAnalyze ? (
        <Button size="sm" variant="outline" className="mt-4" onClick={onAnalyze}>
          Analyze performance
        </Button>
      ) : copy.cta && copy.href ? (
        <Button asChild size="sm" variant="outline" className="mt-4">
          <Link href={copy.href}>{copy.cta}</Link>
        </Button>
      ) : null}
    </div>
  );
}
