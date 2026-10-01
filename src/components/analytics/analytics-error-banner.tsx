import { Button } from "@/components/ui/button";

interface AnalyticsErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function AnalyticsErrorBanner({
  message,
  onRetry,
}: AnalyticsErrorBannerProps) {
  const friendly =
    message.includes("invalid_date_range") ||
    message.toLowerCase().includes("start date")
      ? "Choose a valid date range. The start date must be before the end date."
      : message.startsWith("Unable to") ||
          message.startsWith("We could not") ||
          message.includes("refresh")
        ? message
        : "We could not load analytics right now. Try again in a moment.";

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-md border border-red-500/25 bg-red-500/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-red-200/90">{friendly}</p>
      {onRetry && (
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
