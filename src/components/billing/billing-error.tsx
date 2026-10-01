import { friendlyBillingError } from "@/lib/billing/display";

export function BillingError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-md border border-red-500/25 bg-red-500/5 px-4 py-3"
    >
      <p className="text-sm text-red-200/90">{friendlyBillingError(message)}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-xs font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-adtraxio-accent/50"
        >
          Try again
        </button>
      )}
    </div>
  );
}
