import { friendlyReportError } from "@/lib/reporting/display";

export function ReportError({
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
      <p className="text-sm text-red-200/90">{friendlyReportError(message)}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-xs font-medium text-foreground underline-offset-2 hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
